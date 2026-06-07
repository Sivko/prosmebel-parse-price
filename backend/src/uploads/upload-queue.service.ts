import {
  Injectable,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter } from 'node:events';
import { Model, Types } from 'mongoose';
import { Observable } from 'rxjs';
import { PriceHistory, PriceHistoryDocument } from '../history/price-history.schema';
import { ExternalPriceClient } from './external-price.client';
import { Upload, UploadDocument } from './upload.schema';

type QueueJob = {
  uploadId: string;
  type: 'prepare' | 'sync';
};

@Injectable()
export class UploadQueueService implements OnModuleDestroy, OnModuleInit {
  private readonly queue: QueueJob[] = [];
  private readonly events = new EventEmitter();
  private running = false;

  constructor(
    @InjectModel(Upload.name) private readonly uploadModel: Model<UploadDocument>,
    @InjectModel(PriceHistory.name)
    private readonly historyModel: Model<PriceHistoryDocument>,
    private readonly externalPriceClient: ExternalPriceClient,
  ) {
    this.events.setMaxListeners(1000);
  }

  enqueuePrepare(uploadId: string) {
    this.enqueue({ uploadId, type: 'prepare' });
  }

  enqueueSync(uploadId: string) {
    this.enqueue({ uploadId, type: 'sync' });
  }

  async onModuleInit() {
    const unfinishedUploads = await this.uploadModel
      .find({ status: { $in: ['preparing', 'syncing'] } })
      .select('_id status')
      .lean()
      .exec();

    unfinishedUploads.forEach((upload) => {
      this.enqueue({
        uploadId: upload._id.toString(),
        type: upload.status === 'preparing' ? 'prepare' : 'sync',
      });
    });
  }

  eventsForUpload(uploadId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const listener = (data: string | object) => subscriber.next({ data });
      this.events.on(uploadId, listener);
      void this.emitUpload(uploadId);

      return () => {
        this.events.off(uploadId, listener);
      };
    });
  }

  onModuleDestroy() {
    this.events.removeAllListeners();
  }

  private enqueue(job: QueueJob) {
    this.queue.push(job);
    void this.runNext();
  }

  private async runNext() {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) {
          continue;
        }

        if (job.type === 'prepare') {
          await this.prepareUpload(job.uploadId);
        } else {
          await this.syncUpload(job.uploadId);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async prepareUpload(uploadId: string) {
    const upload = await this.uploadModel.findById(uploadId).lean().exec();
    if (!upload || upload.status !== 'preparing') {
      return;
    }

    let notFoundCount = 0;

    for (let index = 0; index < upload.items.length; index += 1) {
      const item = upload.items[index];

      try {
        const product = await this.externalPriceClient.getBySku(item.article);

        if (!product) {
          notFoundCount += 1;
          await this.setItem(uploadId, index, {
            found: false,
            oldPrice: 0,
            errorMessage: `Product was not found by SKU ${item.article}`,
          });
        } else {
          await this.setItem(uploadId, index, {
            found: true,
            productId: product.productId,
            oldPrice: this.getCurrentPrice(product.prices),
            errorMessage: undefined,
          });
        }
      } catch (error) {
        notFoundCount += 1;
        await this.setItem(uploadId, index, {
          found: false,
          oldPrice: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      await this.uploadModel.findByIdAndUpdate(uploadId, { notFoundCount }).exec();
      await this.emitUpload(uploadId);
    }

    await this.uploadModel
      .findByIdAndUpdate(uploadId, {
        status: 'waiting',
        syncedCount: 0,
        notFoundCount,
      })
      .exec();
    await this.emitUpload(uploadId);
  }

  private async syncUpload(uploadId: string) {
    const upload = await this.uploadModel.findById(uploadId).lean().exec();
    if (!upload || upload.status !== 'syncing') {
      return;
    }

    let syncedCount = upload.syncedCount ?? 0;

    for (let index = 0; index < upload.items.length; index += 1) {
      const item = upload.items[index];
      if (!item.found || !item.productId || item.synced) {
        continue;
      }

      try {
        await this.externalPriceClient.writePrice(item.productId, item.newPrice);
        syncedCount += 1;

        await this.setItem(uploadId, index, {
          synced: true,
          errorMessage: undefined,
        });
        await this.historyModel.create({
          article: item.article,
          price: item.newPrice,
          uploadId: new Types.ObjectId(uploadId),
          uploadedAt: new Date(),
        });
      } catch (error) {
        await this.setItem(uploadId, index, {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      await this.uploadModel.findByIdAndUpdate(uploadId, { syncedCount }).exec();
      await this.emitUpload(uploadId);
    }

    const finalUpload = await this.uploadModel.findById(uploadId).lean().exec();
    const hasErrors = finalUpload?.items.some(
      (item) => item.found && !item.synced,
    );

    await this.uploadModel
      .findByIdAndUpdate(uploadId, {
        status: hasErrors ? 'failed' : 'ready',
        syncedCount,
      })
      .exec();
    await this.emitUpload(uploadId);
  }

  private async setItem(
    uploadId: string,
    index: number,
    patch: Partial<Upload['items'][number]>,
  ) {
    const update = Object.fromEntries(
      Object.entries(patch)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [`items.${index}.${key}`, value]),
    );

    await this.uploadModel.findByIdAndUpdate(uploadId, { $set: update }).exec();
  }

  private getCurrentPrice(prices?: Record<string, number>) {
    return prices?.['17'] ?? prices?.base ?? 0;
  }

  private async emitUpload(uploadId: string) {
    const upload = await this.uploadModel.findById(uploadId).lean().exec();
    if (upload) {
      this.events.emit(uploadId, upload);
    }
  }
}
