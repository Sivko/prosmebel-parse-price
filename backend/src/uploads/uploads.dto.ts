import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { PRICE_REGIONS } from '../common/price-region';

export class CreateUploadDto {
  @IsString()
  @IsNotEmpty()
  sheetName: string;

  @IsString()
  @IsNotEmpty()
  articleColumn: string;

  @IsString()
  @IsNotEmpty()
  priceColumn: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(PRICE_REGIONS)
  region: (typeof PRICE_REGIONS)[number];
}
