import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/current-user';
import type { CurrentUserPayload } from '../common/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUploadDto } from './uploads.dto';
import { UploadsService } from './uploads.service';

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

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.uploadsService.getById(id);
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
