import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { TaxPlanningModule } from './lib/index';
// import { PrismaModule } from './prisma/prisma.module';
import { FwpLatestModule } from './lib/fwp-latest/fwp-latest.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FwpLatestModule,
    TaxPlanningModule,
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule { }
