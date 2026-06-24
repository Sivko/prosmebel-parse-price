import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { PriceRegion } from '../common/price-region';

export type UploadDocument = HydratedDocument<Upload>;

export type UploadStatus =
  | 'preparing'
  | 'waiting'
  | 'syncing'
  | 'ready'
  | 'failed'
  | 'cancelled';

@Schema({ _id: false })
export class UploadItem {
  @Prop({ required: true })
  article: string;

  @Prop({ required: true })
  newPrice: number;

  @Prop({ required: true })
  oldPrice: number;

  @Prop({ required: true, default: true })
  found: boolean;

  @Prop()
  productId?: number;

  @Prop()
  errorMessage?: string;

  @Prop({ required: true, default: false })
  synced: boolean;
}

const UploadItemSchema = SchemaFactory.createForClass(UploadItem);

@Schema({ timestamps: true })
export class Upload {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  sheetName: string;

  @Prop({ required: true })
  articleColumn: string;

  @Prop({ required: true })
  priceColumn: string;

  @Prop({ required: true, enum: ['MSK', 'EKB'] })
  region: PriceRegion;

  @Prop({ required: true })
  priceTypeId: number;

  @Prop({
    required: true,
    enum: ['preparing', 'waiting', 'syncing', 'ready', 'failed', 'cancelled'],
  })
  status: UploadStatus;

  @Prop({ required: true, default: 0 })
  totalArticles: number;

  @Prop({ required: true, default: 0 })
  syncedCount: number;

  @Prop({ required: true, default: 0 })
  notFoundCount: number;

  @Prop({ type: [UploadItemSchema], default: [] })
  items: UploadItem[];

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  createdByLogin: string;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);
