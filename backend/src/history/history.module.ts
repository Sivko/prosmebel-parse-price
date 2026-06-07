import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityModule } from '../auth/security.module';
import { PriceHistory, PriceHistorySchema } from './price-history.schema';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({
  imports: [
    SecurityModule,
    MongooseModule.forFeature([
      { name: PriceHistory.name, schema: PriceHistorySchema },
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
