import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PriceHistoryDocument = HydratedDocument<PriceHistory>;

@Schema({ timestamps: true })
export class PriceHistory {
  @Prop({ index: true })
  article: string;

  @Prop()
  price: number;

  @Prop({ type: Types.ObjectId, index: true })
  uploadId: Types.ObjectId;

  @Prop({ required: true })
  uploadedAt: Date;

  @Prop({ index: true })
  action?: string;

  @Prop()
  deletedCount?: number;

  @Prop()
  createdByLogin?: string;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);
