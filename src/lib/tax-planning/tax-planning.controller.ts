import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { TaxSlabService } from './tax-planning.service';
import { ApiQuery } from '@nestjs/swagger';

@Controller('tax-suggest')
export class TaxPlanningOllamaController {
    constructor(private readonly taxSlabService: TaxSlabService) { }

    @Get('advice')
    @ApiQuery({
        name: 'text',
        required: true,
        type: String,
        description: 'The income for which tax planning advice is required',
    })
    async getTaxPlanningAdvice(
        @Query('text') financialData: string,) {
        return this.taxSlabService.getTaxSlabSuggestion(financialData);
    }
}