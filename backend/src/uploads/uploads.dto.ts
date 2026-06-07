import { IsNotEmpty, IsString } from 'class-validator';

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
}
