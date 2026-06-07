import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { PriceHistory, PriceHistoryDocument } from '../history/price-history.schema';
import { Upload, UploadDocument, UploadItem } from './upload.schema';

type ParsedRow = {
  article: string;
  newPrice: number;
};

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(Upload.name) private readonly uploadModel: Model<UploadDocument>,
    @InjectModel(PriceHistory.name)
    private readonly historyModel: Model<PriceHistoryDocument>,
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

    const items = await Promise.all(
      parsedRows.map(async (row, index) => this.createFakeItem(row, index)),
    );
    const notFoundCount = items.filter((item) => !item.found).length;
    const syncedCount = items.length - notFoundCount;

    const upload = await this.uploadModel.create({
      fileName: file.originalname,
      sheetName: dto.sheetName,
      articleColumn: dto.articleColumn,
      priceColumn: dto.priceColumn,
      status: 'waiting',
      totalArticles: items.length,
      syncedCount,
      notFoundCount,
      items,
      createdBy: new Types.ObjectId(user.userId),
      createdByLogin: user.login,
    });

    await this.historyModel.insertMany(
      items
        .filter((item) => item.found)
        .map((item) => ({
          article: item.article,
          price: item.newPrice,
          uploadId: upload._id,
          uploadedAt: new Date(),
        })),
    );

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

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Upload was not found');
    }

    const upload = await this.uploadModel.findById(id).lean().exec();
    if (!upload) {
      throw new NotFoundException('Upload was not found');
    }

    return upload;
  }

  async start(id: string) {
    const upload = await this.uploadModel
      .findByIdAndUpdate(id, { status: 'ready' }, { new: true })
      .lean()
      .exec();

    if (!upload) {
      throw new NotFoundException('Upload was not found');
    }

    return upload;
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

  private async createFakeItem(row: ParsedRow, index: number): Promise<UploadItem> {
    const found = index % 7 !== 0;
    const oldPrice = found ? Math.max(0, Math.round(row.newPrice * 0.92)) : 0;

    return {
      article: row.article,
      newPrice: row.newPrice,
      oldPrice,
      found,
    };
  }
}
