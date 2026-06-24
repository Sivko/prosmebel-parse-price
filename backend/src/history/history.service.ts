import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isPriceRegion } from '../common/price-region';
import { PriceHistory, PriceHistoryDocument } from './price-history.schema';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(PriceHistory.name)
    private readonly historyModel: Model<PriceHistoryDocument>,
  ) {}

  async getMatrix(query?: string, region?: string) {
    const filter = {
      action: { $exists: false },
      ...(query ? { article: { $regex: query, $options: 'i' } } : {}),
      ...(region && isPriceRegion(region) ? { region } : {}),
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
      const rowKey = `${row.region}:${row.article}`;
      const articleRow = articleMap.get(rowKey) ?? {
        article: row.article,
        region: row.region,
      };
      articleRow[date] = row.price;
      articleMap.set(rowKey, articleRow);
    });

    return {
      dates,
      rows: Array.from(articleMap.values()),
    };
  }
}
