import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceHistory, PriceHistorySchema } from '../history/price-history.schema';
import { SecurityModule } from '../auth/security.module';
import { Upload, UploadSchema } from './upload.schema';
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
  providers: [UploadsService],
})
export class UploadsModule {}
