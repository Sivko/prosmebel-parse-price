import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PriceHistoryDocument = HydratedDocument<PriceHistory>;

@Schema({ timestamps: true })
export class PriceHistory {
  @Prop({ required: true, index: true })
  article: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  uploadId: Types.ObjectId;

  @Prop({ required: true })
  uploadedAt: Date;
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);
