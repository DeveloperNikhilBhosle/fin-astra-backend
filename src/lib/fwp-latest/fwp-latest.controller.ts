import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { FwpLatestService } from './services/index';
import { FwpDto } from './fwp-latest.dto';
import { Response } from 'express';
import { Readable } from 'stream';
import { ApiTags } from '@nestjs/swagger';

@Controller('fwp-latest')
@ApiTags('FWP Latest')
export class FwpLatestController {
  constructor(
    private readonly fwpLatestService: FwpLatestService,

  ) { }

  @Get('pdf')
  async generatePdf(@Body() jsondata: FwpDto, @Res() res: Response) {
    try {
      if (Object.keys(jsondata).length === 0) {
        res.status(HttpStatus.BAD_REQUEST).send({
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid JSon Error while generating FWP PDF',
        });
      } else {
        const pdfContent = await this.fwpLatestService.fwp_pdf(jsondata);

        // Set the response headers for PDF content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=output.pdf');
        res.send(pdfContent);
      }
    } catch (error) {
      // Handle any errors that occur during PDF generation
      Logger.log(error);
      res.status(500).send('Error generating PDF');
    }
  }



}
