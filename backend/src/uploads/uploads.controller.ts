import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/current-user';
import type { CurrentUserPayload } from '../common/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUploadDto } from './uploads.dto';
import { UploadsService } from './uploads.service';
import { isPriceRegion } from '../common/price-region';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.getWorkbookPreview(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateUploadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.uploadsService.createFromFile(file, dto, user);
  }

  @Get()
  list() {
    return this.uploadsService.list();
  }

  @Delete('rollback')
  rollbackExcelPrices(
    @Query('region') region: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!isPriceRegion(region)) {
      throw new BadRequestException('Region must be MSK or EKB');
    }

    return this.uploadsService.rollbackExcelPrices(user, region);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('withProductIdOnly') withProductIdOnly?: string,
  ) {
    return this.uploadsService.getById(id, {
      page,
      limit,
      withProductIdOnly: withProductIdOnly === 'true',
    });
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.uploadsService.start(id);
  }

  @Sse(':id/events')
  events(@Param('id') id: string) {
    return this.uploadsService.events(id);
  }
}
