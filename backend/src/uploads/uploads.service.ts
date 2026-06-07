import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { PriceHistory, PriceHistoryDocument } from '../history/price-history.schema';
import { ExternalPriceClient } from './external-price.client';
import { Upload, UploadDocument, UploadItem } from './upload.schema';
import { UploadQueueService } from './upload-queue.service';

type ParsedRow = {
  article: string;
  newPrice: number;
};

type UploadItemsQuery = {
  page?: string;
  limit?: string;
  withProductIdOnly?: boolean;
};

type UploadDetailsResponse = Omit<Upload, 'items'> & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  items: UploadItem[];
  notFoundItems: UploadItem[];
  itemPage: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(Upload.name) private readonly uploadModel: Model<UploadDocument>,
    @InjectModel(PriceHistory.name)
    private readonly historyModel: Model<PriceHistoryDocument>,
    private readonly externalPriceClient: ExternalPriceClient,
    private readonly uploadQueueService: UploadQueueService,
  ) {}

  getWorkbookPreview(file: Express.Multer.File) {
    const workbook = this.readWorkbook(file);
    return {
      fileName: file.originalname,
      sheets: workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
        });
        return {
          name: sheetName,
          columns: rows[0] ? Object.keys(rows[0]) : [],
          examples: rows.slice(0, 5),
        };
      }),
    };
  }

  async createFromFile(
    file: Express.Multer.File,
    dto: { sheetName: string; articleColumn: string; priceColumn: string },
    user: { userId: string; login: string },
  ) {
    const workbook = this.readWorkbook(file);
    const sheet = workbook.Sheets[dto.sheetName];

    if (!sheet) {
      throw new BadRequestException('Selected sheet was not found');
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
    const parsedRows = this.parseRows(rows, dto.articleColumn, dto.priceColumn);

    if (parsedRows.length === 0) {
      throw new BadRequestException('No records found in selected columns');
    }

    const items = parsedRows.map((row) => this.createPendingItem(row));

    const upload = await this.uploadModel.create({
      fileName: file.originalname,
      sheetName: dto.sheetName,
      articleColumn: dto.articleColumn,
      priceColumn: dto.priceColumn,
      status: 'preparing',
      totalArticles: items.length,
      syncedCount: 0,
      notFoundCount: 0,
      items,
      createdBy: new Types.ObjectId(user.userId),
      createdByLogin: user.login,
    });

    this.uploadQueueService.enqueuePrepare(upload._id.toString());

    return upload;
  }

  async list() {
    return this.uploadModel
      .find()
      .select('-items')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getById(
    id: string,
    query: UploadItemsQuery = {},
  ): Promise<UploadDetailsResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Upload was not found');
    }

    const upload = await this.uploadModel.findById(id).lean().exec();
    if (!upload) {
      throw new NotFoundException('Upload was not found');
    }

    const page = this.parsePositiveInteger(query.page, 1);
    const limit = Math.min(this.parsePositiveInteger(query.limit, 20), 100);
    const items = query.withProductIdOnly
      ? upload.items.filter((item) => item.productId != null)
      : upload.items;
    const total = items.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;

    return {
      ...upload,
      items: items.slice(start, start + limit),
      notFoundItems: upload.items.filter((item) => !item.found),
      itemPage: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    } as UploadDetailsResponse;
  }

  async start(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Upload was not found');
    }

    const currentUpload = await this.uploadModel.findById(id).lean().exec();
    if (!currentUpload) {
      throw new NotFoundException('Upload was not found');
    }

    if (currentUpload.status !== 'waiting' && currentUpload.status !== 'failed') {
      throw new BadRequestException('Upload is not ready to start');
    }

    const upload = await this.uploadModel
      .findByIdAndUpdate(id, { status: 'syncing' }, { new: true })
      .lean()
      .exec();
    if (!upload) {
      throw new NotFoundException('Upload was not found');
    }

    this.uploadQueueService.enqueueSync(id);

    return upload;
  }

  async rollbackExcelPrices(user: { userId: string; login: string }) {
    const result = await this.externalPriceClient.deleteExcelPrices();

    await this.historyModel.create({
      action: 'rollback-excel-prices',
      deletedCount: result.deletedCount,
      createdBy: new Types.ObjectId(user.userId),
      createdByLogin: user.login,
      uploadedAt: new Date(),
    });

    return result;
  }

  events(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Upload was not found');
    }

    return this.uploadQueueService.eventsForUpload(id);
  }

  private readWorkbook(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Excel file is required');
    }

    return XLSX.read(file.buffer, { type: 'buffer' });
  }

  private parseRows(
    rows: Record<string, unknown>[],
    articleColumn: string,
    priceColumn: string,
  ): ParsedRow[] {
    return rows
      .map((row) => ({
        article: String(row[articleColumn] ?? '').trim(),
        newPrice: this.parsePrice(row[priceColumn]),
      }))
      .filter((row) => row.article && Number.isFinite(row.newPrice));
  }

  private parsePrice(value: unknown) {
    if (typeof value === 'number') {
      return value;
    }

    const normalized = String(value ?? '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '');
    return Number(normalized);
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private createPendingItem(row: ParsedRow): UploadItem {
    return {
      article: row.article,
      newPrice: row.newPrice,
      oldPrice: 0,
      found: false,
      synced: false,
    };
  }
}
