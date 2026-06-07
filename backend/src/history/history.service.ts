import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PriceHistory, PriceHistoryDocument } from './price-history.schema';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(PriceHistory.name)
    private readonly historyModel: Model<PriceHistoryDocument>,
  ) {}

  async getMatrix(query?: string) {
    const filter = {
      action: { $exists: false },
      ...(query ? { article: { $regex: query, $options: 'i' } } : {}),
    };
    const rows = await this.historyModel
      .find(filter)
      .sort({ uploadedAt: 1 })
      .lean()
      .exec();

    const dates = Array.from(
      new Set(rows.map((row) => row.uploadedAt.toISOString().slice(0, 10))),
    );
    const articleMap = new Map<string, Record<string, number | string>>();

    rows.forEach((row) => {
      const date = row.uploadedAt.toISOString().slice(0, 10);
      const articleRow = articleMap.get(row.article) ?? { article: row.article };
      articleRow[date] = row.price;
      articleMap.set(row.article, articleRow);
    });

    return {
      dates,
      rows: Array.from(articleMap.values()),
    };
  }
}
