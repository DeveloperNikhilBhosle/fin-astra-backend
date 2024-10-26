import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Options,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { FwpLatestService } from './services/index';
// import { FwpDto } from './fwp-latest.dto';
import { Response } from 'express';
import { Readable } from 'stream';
import { ApiTags } from '@nestjs/swagger';
import * as path from 'path';
import { buffer } from 'stream/consumers';

@Controller('fwp-latest')
@ApiTags('FWP Latest')
export class FwpLatestController {
  constructor(
    private readonly fwpLatestService: FwpLatestService,

  ) { }

  @Post('pdf')
  async generatePdf(@Body() jsondata: any, @Res() res: Response) {
    try {
      console.log(jsondata)
      const req = JSON.parse(jsondata.data);
      console.log(req, 'req');
      if (Object.keys(jsondata).length === 0) {
        res.status(HttpStatus.BAD_REQUEST).send({
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid JSon Error while generating FWP PDF',
        });
      } else {
        const pdfContent = await this.fwpLatestService.fwp_pdf(req);

        // Set the response headers for PDF content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=output.pdf');
        res.send({ status: 200, pdf: path.join(__dirname, "/pdf_files/fwp_pdf/output.pdf"), base64: pdfContent.toString("base64") });
      }
    } catch (error) {
      // Handle any errors that occur during PDF generation
      Logger.log(error);
      res.status(500).send('Error generating PDF');
    }
  }



}
