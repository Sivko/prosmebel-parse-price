import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceHistory, PriceHistorySchema } from '../history/price-history.schema';
import { SecurityModule } from '../auth/security.module';
import { ExternalPriceClient } from './external-price.client';
import { Upload, UploadSchema } from './upload.schema';
import { UploadQueueService } from './upload-queue.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    SecurityModule,
    MongooseModule.forFeature([
      { name: Upload.name, schema: UploadSchema },
      { name: PriceHistory.name, schema: PriceHistorySchema },
    ]),
  ],
  controllers: [UploadsController],
  providers: [ExternalPriceClient, UploadQueueService, UploadsService],
})
export class UploadsModule {}
