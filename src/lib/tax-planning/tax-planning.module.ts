import { Module } from '@nestjs/common';
import { TaxPlanningOllamaController } from './tax-planning.controller';
import { TaxSlabService } from './tax-planning.service'
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [TaxPlanningOllamaController],
    providers: [TaxSlabService],
})
export class TaxPlanningModule { }