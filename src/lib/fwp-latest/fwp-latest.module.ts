import { Module } from '@nestjs/common';
import { FwpLatestController } from './fwp-latest.controller';
import { BullModule } from '@nestjs/bull';
import { FWPHelper } from '@app/shared/helpers';
import { FwpLatestService } from './services/fwp-latest.service';

@Module({
  imports: [],
  controllers: [FwpLatestController],
  providers: [
    FWPHelper,
    FwpLatestService,
  ],
  exports: [FwpLatestService],
})
export class FwpLatestModule { }
