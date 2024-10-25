import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { Response } from 'express';
import { PDFKit } from 'pdfkit';
const Chart = require('chart.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
import * as ChartDataLabels from 'chartjs-plugin-datalabels';
import { v4 as uuidv4 } from 'uuid';

import { PDFDocument as PDFLIBDocument } from 'pdf-lib';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
const PDFDocument = require('pdfkit');
const fs = require('fs');
import { ColorEnum } from '@app/shared/utils/color';
import { FwpLatestAnalysisConst } from '../fwp-latest.constants';
import { FWPHelper } from '@app/shared/helpers';
import { title } from 'process';

const cwd = process.cwd();
@Injectable()
export class FwpLatestService {
  private chartJSNodeCanvas: typeof ChartJSNodeCanvas;
  private page_index: number;
  private your_1_view_idx: number;
  private your_fin_analysis_idx: number;
  private your_fin_product_idx: number;

  constructor(private fwpHelper: FWPHelper) {
    // private readonly prisma: PrismaService, // @InjectQueue('fwp') private readonly fwpQueue: Queue,
    // Initialize the instance variables

    const options = {
      // Specify the width and height of the canvas
      width: 1000,
      height: 1000,
    };
    // const cwd = process.cwd();
    // register font on chart ( path.join(cwd, 'python_scripts', 'ms_report', 'assets', 'fonts', 'Prata', 'Prata-Regular.ttf'), { family: 'Prata' });

    this.chartJSNodeCanvas = new ChartJSNodeCanvas(options);
    Chart.register(ChartDataLabels);

    Chart.register({
      id: 'sliceThickness',
      beforeDraw(chart, plugin) {
        let sliceThicknessPixel = 220; // Set the desired thickness
        // console.log(chart.getDatasetMeta(0).data[0]);
        for (
          let index = 0;
          index < chart.getDatasetMeta(0).data.length;
          index++
        ) {
          const datasetMeta = chart.getDatasetMeta(0).data[index];

          if (datasetMeta.circumference === 0) {
            sliceThicknessPixel = sliceThicknessPixel == 225 ? 240 : 225;
          }

          sliceThicknessPixel = sliceThicknessPixel == 225 ? 240 : 225;

          // Other logic as needed
          datasetMeta.outerRadius =
            (chart.chartArea.width / sliceThicknessPixel) * 100;
          datasetMeta.innerRadius = 90;
        }
      },
    });
  }

  hex2RGB(hex: string): number[] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  px2MM(px: number): number {
    // Convert pixels to millimeters
    const mm = px * 0.264583;
    return mm;
  }

  mm2PX(mm: number, dpi: number = 96): number {
    const inches = mm / 25.4;
    const pixels = inches * dpi;
    return pixels;
  }
  pt2px(pt: number): number {
    const px = pt / 0.75;
    return px;
  }

  multicell_height(
    pdf: any,
    text: string[],
    width: number,
    line_height: number,
  ) {
    let lines = 0;
    for (let i = 0; i < text.length; i++) {
      const line = text[i];
      const line_width = pdf.fontSize(28).widthOfString(line);
      const line_height = pdf.currentLineHeight();
      lines += Math.ceil(line_width / width);
      lines += i % 3 == 0 ? 1 : 0;
    }
    return lines * line_height;
  }

  index_text(pdf: PDFKit.PDFDocument, color) {
    this.page_index += 1;
    pdf
      .font('LeagueSpartan-Regular')
      .fontSize(this.px2MM(30))
      .fillColor(this.hex2RGB(color));
    pdf.text(this.page_index.toString(), this.px2MM(1853), this.px2MM(1018), {
      width: this.px2MM(45),
      align: 'right',
    });
  }

  format_cash2(amount: number) {
    let negativeFlag = false;
    if (amount < 0) {
      amount = Math.abs(amount);
      negativeFlag = true;
    }
    const truncateFloat = (number: number, places: number): number => {
      return Math.round(number * Math.pow(10, places)) / Math.pow(10, places);
    };

    if (amount <= 1e1) {
      let x = String(truncateFloat(amount / 1e5, 2).toFixed(1));
      if (!negativeFlag) {
        return x + 'L';
      } else {
        return '-' + x + 'L';
      }
    }

    if (1e1 < amount && amount <= 1e3) {
      let x = String(truncateFloat(amount / 1e3, 2).toFixed(1));
      if (!negativeFlag) {
        return x + 'K';
      } else {
        return '-' + x + 'K';
      }
    }

    if (1e3 <= amount && amount < 1e5) {
      let x = String(truncateFloat((amount / 1e5) * 100, 2).toFixed(1));
      if (!negativeFlag) {
        return x + 'K';
      } else {
        return '-' + x + 'K';
      }
    }

    if (1e5 <= amount && amount < 1e7) {
      let x = String(truncateFloat((amount / 1e7) * 100, 2).toFixed(1));
      if (!negativeFlag) {
        return x + 'L';
      } else {
        return '-' + x + 'L';
      }
    }

    if (amount >= 1e7) {
      let x = String(truncateFloat(amount / 1e7, 2).toFixed(1));
      if (!negativeFlag) {
        return x + 'Cr';
      } else {
        return '-' + x + 'Cr';
      }
    }

    return '';
  }

  format_amt_number(amount: number) {
    return new Intl.NumberFormat('en-IN').format(amount);
  }

  scale_pdf() {
    const contentWidth = this.px2MM(1920);
    const contentHeight = this.px2MM(1080);

    const scaleX = 841.89 / contentWidth;
    const scaleY = 595.28 / contentHeight;
    const scale = Math.min(scaleX, scaleY);
    return scale;
  }

  contentsPage(pdf: PDFKit.PDFDocument) {
    try {
      pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      pdf.scale(this.scale_pdf() || 1.6572658674215652);
      pdf.fillColor(this.hex2RGB('#000000'));
      pdf.rect(0, 0, this.px2MM(1920), this.px2MM(1080)).fill();

      pdf.moveTo(this.px2MM(120), this.px2MM(80));
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(60))
        .fillColor(this.hex2RGB('#FFFFFF'));
      pdf.text('CONTENTS', this.px2MM(120), this.px2MM(80), {
        width: this.px2MM(600),
        height: this.px2MM(84),
        align: 'left',
      });

      ////*----- for vertical dash
      let basy_y = 204;
      const y_gap = 140;
      // h_y = 128.83
      const fill_color = ColorEnum.FININACIAL_ANALYSIS;

      let cont_head_basey = 210;
      let cont_para_basey = 266;

      const cont_headings = FwpLatestAnalysisConst.CONTENT_HEADER;

      const cont_para = FwpLatestAnalysisConst.CONTENT_SUBHEADER;
      const index_no = [
        this.your_1_view_idx,
        this.your_fin_analysis_idx,
        this.your_fin_product_idx,
      ];

      for (let i = 0; i < cont_headings.length; i++) {
        pdf
          .fillColor(this.hex2RGB(fill_color))
          .rect(
            this.px2MM(120),
            this.px2MM(cont_head_basey),
            this.px2MM(8),
            this.px2MM(100),
          )
          .fill();

        pdf.moveTo(this.px2MM(168), this.px2MM(cont_head_basey));
        pdf
          .font('LeagueSpartan-SemiBold')
          .fontSize(this.px2MM(40))
          .fillColor(this.hex2RGB('#FFFFFF'))
          .lineWidth(this.px2MM(2));
        pdf.text(
          cont_headings[i],
          this.px2MM(168),
          this.px2MM(cont_head_basey + 8),
          { width: this.px2MM(1500), height: this.px2MM(56), align: 'left' },
        );

        pdf.moveTo(this.px2MM(168), this.px2MM(cont_para_basey));
        pdf
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#898B90'));
        pdf.text(
          cont_para[i],
          this.px2MM(168),
          this.px2MM(cont_para_basey + 8),
          {
            width: this.px2MM(1500),
            height: this.px2MM(32),
            align: 'left',
          },
        );

        ////*---Index Number----*//
        pdf
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(30))
          .fillColor(this.hex2RGB('#898B90'));
        pdf.text(
          index_no[i].toString(),
          this.px2MM(1675),
          this.px2MM(263 + i * 140),
          { width: this.px2MM(125), height: this.px2MM(42), align: 'right' },
        );

        cont_head_basey += y_gap;
        cont_para_basey += y_gap;
      }

      pdf
        .font('Inter-Light')
        .fontSize(this.px2MM(16))
        .fillColor(this.hex2RGB('#898B90'));
      // pdf.font('LeagueSpartan-Medium').fontSize(16).fillColor(this.hex2RGB('#898B90'));

      pdf.text('®', this.px2MM(550), this.px2MM(265), {
        width: this.px2MM(16),
        height: this.px2MM(34),
        align: 'left',
      });

      this.page_index += 1;
      // pdf.movePage(this.page_index - 1, 1);
    } catch (err) {
      Logger.error(err);
    }
  }

  oneView(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      const investments = jsondata?.investments || [];

      pdf.addPage();
      pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      pdf.scale(this.scale_pdf() || 1.6572658674215652);

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf.rect(0, 0, this.px2MM(1920), this.px2MM(1080)).fill();

      pdf.fillColor(this.hex2RGB('#ffffff'));
      pdf
        .rect(this.px2MM(0), this.px2MM(80), this.px2MM(15), this.px2MM(84))
        .fill();

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(60))
        .fillColor(this.hex2RGB('#ffffff'))
        .text('Your 1 View', this.px2MM(120), this.px2MM(92), {
          width: this.px2MM(300),
          height: this.px2MM(84),
        });

      let Ind_width = 20;
      let Ind_height = 25;
      //card 1
      pdf
        .fillColor(this.hex2RGB('#E6E0FF'))
        .rect(
          this.px2MM(120),
          this.px2MM(204),
          this.px2MM(527),
          this.px2MM(160 + 70 * Object.keys(investments).length),
        )
        .fill();

      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'Assets.png',
        ),
        this.px2MM(160),
        this.px2MM(244),
        { width: this.px2MM(60), height: this.px2MM(60) },
      );
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#000000'))
        .text('Investments', this.px2MM(240), this.px2MM(254), {
          width: this.px2MM(250),
          height: this.px2MM(56),
          align: 'left',
        });

      const total_investments = jsondata?.investments?.reduce((acc, curr) => {
        return acc + parseFloat(curr.value);
      }
        , 0);
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .fillColor(this.hex2RGB('#000000'))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(total_investments),
          ),
          this.px2MM(500),
          this.px2MM(259),
          { width: this.px2MM(105), height: this.px2MM(42), align: 'left' },
        );
      // pdf
      //   .font('LeagueSpartan-SemiBold')
      //   .fontSize(this.px2MM(24))
      //   .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
      //   .text(
      //     '₹ ' +
      //     this.format_cash2(
      //       parseFloat(jsondata['oneview']['total']['assets']),
      //     ),
      //     this.px2MM(500),
      //     this.px2MM(262),
      //     { width: this.px2MM(80), height: this.px2MM(42), align: 'left' },
      //   );
      // pdf.image(
      //   path.join(
      //     cwd,
      //     'src',
      //     'lib',
      //     'shared',
      //     'assets',
      //     'images',
      //     'icons',
      //     'ArrowUp.png',
      //   ),
      //   this.px2MM(575),
      //   this.px2MM(258),
      //   { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      // );

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(investments).length; rows++) {
        // pdf.lineWidth(this.px2MM(0.1))
        //     .fillColor(this.hex2RGB('#FFFFFF'))
        // pdf.rect(this.px2MM(160), this.px2MM(324 + (rows * 72)), this.px2MM(290), this.px2MM(72)).fill();
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(160),
            this.px2MM(324 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .fill();
        pdf
          .lineWidth(this.px2MM(1))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(160),
            this.px2MM(324 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .stroke();

        pdf
          .rect(
            this.px2MM(450),
            this.px2MM(324 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .fill();
        pdf
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#000000'))
          .text(
            investments[rows]['title'],
            this.px2MM(180),
            this.px2MM(344 + rows * 72),
            { width: this.px2MM(250), height: this.px2MM(32), align: 'left' },
          );

        pdf.lineWidth(this.px2MM(1)).strokeColor(this.hex2RGB('#E9EAEE'));
        pdf
          .rect(
            this.px2MM(450),
            this.px2MM(324 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .stroke();

        if (investments[rows]['value'] == ' ' || investments[rows]['value'] == '') {
          pdf.text('-', this.px2MM(470), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          investments[rows]['value'] == ' ' ||
          investments[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(470), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 455;
          const val = this.format_cash2(parseFloat(investments[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
          // pdf.image(
          //   path.join(
          //     cwd,
          //     'src',
          //     'lib',
          //     'shared',
          //     'assets',
          //     'images',
          //     'icons',
          //     'ArrowUp.png',
          //   ),
          //   this.px2MM(val_x + 115),
          //   this.px2MM(342 + rows * 72),
          //   { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          // );
        }
      }

      //card 2

      const insurances = [{
        title: 'self',
        value: jsondata?.insurance?.self || 0
      },
      {
        title: 'parents',
        value: jsondata?.insurance?.parents || 0
      }
      ];

      pdf
        .fillColor(this.hex2RGB('#FFF3DB'))
        .rect(
          this.px2MM(696),
          this.px2MM(204),
          this.px2MM(527),
          this.px2MM(304),
        )
        .fill();

      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'Liabilities.png',
        ),
        this.px2MM(736),
        this.px2MM(244),
        { width: this.px2MM(60), height: this.px2MM(60) },
      );
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#000000'))
        .text('Insurances', this.px2MM(816), this.px2MM(254), {
          width: this.px2MM(244),
          height: this.px2MM(56),
          align: 'left',
        });


      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(insurances).length; rows++) {
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(736),
            this.px2MM(324 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .fill();
        pdf
          .lineWidth(this.px2MM(1))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(736),
            this.px2MM(324 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .stroke();

        pdf
          .rect(
            this.px2MM(1026),
            this.px2MM(324 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .fill();
        pdf
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#000000'))
          .text(
            insurances[rows]['title'],
            this.px2MM(756),
            this.px2MM(344 + rows * 72),
            { width: this.px2MM(250), height: this.px2MM(32), align: 'left' },
          );

        pdf.lineWidth(this.px2MM(1)).strokeColor(this.hex2RGB('#E9EAEE'));
        pdf
          .rect(
            this.px2MM(1026),
            this.px2MM(324 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .stroke();

        if (
          insurances[rows]['value'] == ' ' ||
          insurances[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1046), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          insurances[rows]['value'] == ' ' ||
          insurances[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1046), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1031;
          const val = this.format_cash2(parseFloat(insurances[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        }
      }

      //card 3

      const HRA = [{
        title: 'Actual HRA',
        value: jsondata?.hra?.actual_hra || 0
      },
      {
        title: 'Deduction Allowed',
        value: jsondata?.hra?.deduction_allowed || 0
      }

      ]

      pdf
        .fillColor(this.hex2RGB('#DEEDFF'))
        .rect(
          this.px2MM(696),
          this.px2MM(558),
          this.px2MM(527),
          this.px2MM(304),
        )
        .fill();

      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'Income.png',
        ),
        this.px2MM(736),
        this.px2MM(598),
        { width: this.px2MM(60), height: this.px2MM(60) },
      );

      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#000000'))
        .text('HRA', this.px2MM(816), this.px2MM(608), {
          width: this.px2MM(155),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(HRA).length; rows++) {
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(736),
            this.px2MM(678 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .fill();
        pdf
          .lineWidth(this.px2MM(1))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(736),
            this.px2MM(678 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .stroke();

        pdf
          .rect(
            this.px2MM(1026),
            this.px2MM(678 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .fill();
        pdf
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#000000'))
          .text(
            HRA[rows]['title'],
            this.px2MM(756),
            this.px2MM(702 + rows * 72),
            { width: this.px2MM(250), height: this.px2MM(32), align: 'left' },
          );

        pdf.lineWidth(this.px2MM(1)).strokeColor(this.hex2RGB('#E9EAEE'));
        pdf
          .rect(
            this.px2MM(1026),
            this.px2MM(678 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .stroke();

        if (HRA[rows]['value'] == ' ' || HRA[rows]['value'] == '') {
          pdf.text('-', this.px2MM(1046), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          HRA[rows]['value'] == ' ' ||
          HRA[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1046), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1031;
          const val = this.format_cash2(parseFloat(HRA[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });

          // pdf.image(
          //   path.join(
          //     cwd,
          //     'src',
          //     'lib',
          //     'shared',
          //     'assets',
          //     'images',
          //     'icons',
          //     'ArrowUp.png',
          //   ),
          //   this.px2MM(val_x + 115),
          //   this.px2MM(701 + rows * 72),
          //   { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          // );
        }
      }

      ///card 4

      const other = jsondata?.other || [];

      pdf
        .fillColor(this.hex2RGB('#FFE7CC'))
        .rect(
          this.px2MM(1273),
          this.px2MM(204),
          this.px2MM(527),
          this.px2MM(160 + 70 * Object.keys(other).length),
        )
        .fill();

      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'Insurance.png',
        ),
        this.px2MM(1313),
        this.px2MM(244),
        { width: this.px2MM(60), height: this.px2MM(60) },
      );
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#000000'))
        .text('Others', this.px2MM(1393), this.px2MM(254), {
          width: this.px2MM(158),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(other).length; rows++) {
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(1313),
            this.px2MM(324 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .fill();
        pdf
          .lineWidth(this.px2MM(1))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(1313),
            this.px2MM(324 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .stroke();

        pdf
          .rect(
            this.px2MM(1603),
            this.px2MM(324 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .fill();
        pdf
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#000000'))
          .text(
            other[rows]['title'],
            this.px2MM(1333),
            this.px2MM(344 + rows * 72),
            { width: this.px2MM(250), height: this.px2MM(32), align: 'left' },
          );

        pdf.lineWidth(this.px2MM(1)).strokeColor(this.hex2RGB('#E9EAEE'));
        pdf
          .rect(
            this.px2MM(1603),
            this.px2MM(324 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .stroke();

        if (other[rows]['value'] == ' ' || other[rows]['value'] == '') {
          pdf.text('-', this.px2MM(1623), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          other[rows]['value'] == ' ' ||
          other[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1623), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1608;
          const val = this.format_cash2(parseFloat(other[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });

        }
      }

      //index
      this.index_text(pdf, '#FFFFFF');
      this.your_1_view_idx = this.page_index;
    } catch (err) {
      Logger.error(err);
    }
  }


  async generatePieChart(labels, data, colors) {
    try {
      const cwd = process.cwd();
      // const chartCallback = (ChartJS) => {
      // ChartJS.defaults.global.defaultFontFamily = 'Prata';
      // ChartJS.defaults.global.defaultFontSize = 30;
      // ChartJS.defaults.global.defaultFontColor = '#000000';
      // ChartJS.defaults.global.defaultFontStyle = 'bold';
      //     ChartJS.register(ChartDataLabels);
      // }

      // const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

      const chartData = {
        labels: labels,
        cutoutPercentage: 70,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderWidth: 4,
            borderColor: '#000000',
            hoverOffset: 4,
            radius: 400,
          },
        ],
      };

      const chartOptions = {
        responsive: true,

        aspectRatio: 1,
        // maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          datalabels: {
            font: {
              family: 'Futura, Arial, sans-serif',
              size: 50,
              // color: '#000000',
            },
            formatter: (value, ctx) => {
              // console.log(value);
              const percentage = Math.round(
                (value /
                  chartData.datasets[0].data.reduce((a, b) => a + b, 0)) *
                100,
              );
              if (percentage > 3) {
                return `${percentage.toString()}%`;
              } else {
                return '';
              }
            },
            color: '#000000',
            display: true,
          },
          tooltip: {
            enabled: true,
          },
        },
      };

      let configuration = {
        type: 'doughnut',
        data: chartData,
        options: chartOptions,
      };

      let image = await this.chartJSNodeCanvas.renderToBuffer(configuration);

      // const doc = new PDFDocument({ size: [1920, 1080], layout: 'landscape' });
      // doc.pipe(fs.createWriteStream('test.pdf'));
      // doc.image(Buffer.from(image, 'base64'), 0, 0, { width: 1920, height: 1080 });
      // doc.end();

      return image;
    } catch (err) {
      // console.log('error', err);
      Logger.error(err);
    }
  }

  async assetsChart(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      const assets_table = [{
        title: 'Salary',
        value: Number(jsondata?.income_source?.salary) || 0
      },
      {
        title: 'Bonus',
        value: Number(jsondata?.income_source?.bonus) || 0
      },
      {
        title: 'House Property',
        value: Number(jsondata?.income_source?.house_property) || 0
      },
      {
        title: 'Capital Gain',
        value: Number(jsondata?.income_source?.capital_gain) || 0
      },
      {
        title: 'Others',
        value: Number(jsondata?.income_source?.other) || 0
      }
      ];
      const total_assets = assets_table.reduce((acc, curr) =>
        acc + curr.value
        , 0);
      const assets_pie = [{
        particular: 'Salary',
        percentage: Number(jsondata?.income_source?.salary || '0') / total_assets * 100
      },
      {
        particular: 'Bonus',
        percentage: Number(jsondata?.income_source?.bonus || '0') / total_assets * 100
      },
      {
        particular: 'House Property',
        percentage: Number(jsondata?.income_source?.house_property || '0') / total_assets * 100
      },
      {
        particular: 'Capital Gain',
        percentage: Number(jsondata?.income_source?.capital_gain || '0') / total_assets * 100
      },
      {
        particular: 'Others',
        percentage: Number(jsondata?.income_source?.other || '0') / total_assets * 100
      }]

      let colors = ['#A792FF', '#82DBC6', '#90BEF8', '#FFC27E', '#FFD976'];
      let labels = [];
      let data = [];

      let total_Income =
        assets_pie.forEach((element, index) => {
          element['colors'] = colors[index];
          labels.push(element['particular']);
          data.push(element['percentage']);
        });
      const chartImage = await this.generatePieChart(labels, data, colors);

      let start = 0;
      let stop = 8;

      for (let i = 0; i < Object.keys(assets_table).length; i += 8) {
        pdf.addPage();
        pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
        pdf.scale(this.scale_pdf() || 1.6572658674215652);

        pdf
          .fillColor(this.hex2RGB('#FCF8ED'))
          .rect(0, 0, this.px2MM(1920), this.px2MM(1080))
          .fill();

        pdf
          .fillColor(this.hex2RGB('#000000'))
          .rect(0, 0, this.px2MM(964), this.px2MM(1080))
          .fill();

        pdf
          .font('LeagueSpartan-SemiBold')
          .fontSize(this.px2MM(60))
          .fillColor(this.hex2RGB('#ffffff'))
          .text('Income Sources', this.px2MM(120), this.px2MM(92), {
            width: this.px2MM(600),
            height: this.px2MM(84),
            align: 'left',
          });

        const now = new Date();
        const day: string = now.getDate().toString();
        const month: string = now.toLocaleString('default', { month: 'short' });
        const year: string = now.getFullYear().toString();

        let suffix: string = '';

        if (
          (4 <= parseInt(day) && parseInt(day) <= 20) ||
          (24 <= parseInt(day) && parseInt(day) <= 30)
        ) {
          suffix = 'th';
        } else {
          const suffixes: string[] = ['st', 'nd', 'rd'];
          suffix = suffixes[(parseInt(day) % 10) - 1];
        }

        //Exising Assets Block
        pdf
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#ffffff'))
          .text(
            `As on ${day}${suffix} ${month} ${year}`,
            this.px2MM(600),
            this.px2MM(110),
            { width: this.px2MM(400), height: this.px2MM(32), align: 'left' },
          );

        // let label_block_x = 1280;
        // let label_block_y = 81;
        // let label_block_width = 520;
        // let label_block_height = 82;

        // pdf
        //   .fillColor(this.hex2RGB('#000000'))
        //   .rect(
        //     this.px2MM(label_block_x),
        //     this.px2MM(label_block_y),
        //     this.px2MM(label_block_width),
        //     this.px2MM(label_block_height),
        //   )
        //   .fill();

        // pdf
        //   .font('LeagueSpartan-SemiBold')
        //   .fontSize(this.px2MM(30))
        //   .fillColor(this.hex2RGB('#ffffff'))
        //   .text(
        //     `Existing Assets: `,
        //     this.px2MM(label_block_x + 30),
        //     this.px2MM(107),
        //     { width: this.px2MM(330), height: this.px2MM(42), align: 'left' },
        //   );

        // TODO: Change this to correct value
        // const indicatorval = jsondata['assets']['total']['market_value'];
        // const indicatorColor = ColorEnum.INDICATOR_UP_LIGHT;

        // pdf
        //   .font('LeagueSpartan-SemiBold')
        //   .fontSize(this.px2MM(42))
        //   .fillColor(this.hex2RGB('#ffffff'))
        //   .text(
        //     `₹ ${this.format_cash2(
        //       parseFloat(jsondata['assets']['total']['market_value']),
        //     )} `,
        //     this.px2MM(label_block_x + 245),
        //     this.px2MM(100),
        //     {
        //       width: this.px2MM(370),
        //       height: this.px2MM(42),
        //       align: 'left',
        //       continued: true,
        //     },
        //   )
        //   .font('LeagueSpartan-SemiBold')
        //   .fontSize(this.px2MM(24))
        //   .fillColor(this.hex2RGB(indicatorColor))
        //   .text(
        //     ` ₹ ${this.format_cash2(parseFloat(indicatorval))}`,
        //     this.px2MM(label_block_x + 245),
        //     this.px2MM(110),
        //     { width: this.px2MM(100), height: this.px2MM(42), align: 'left' },
        //   );

        let Ind_width = 10;
        let Ind_height = 17;
        pdf.image(
          path.join(
            cwd,
            'src',
            'lib',
            'shared',
            'assets',
            'images',
            'icons',
            'ArrowUpLight.png',
          ),
          this.px2MM(1762),
          this.px2MM(109),
          { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
        );

        pdf.image(chartImage, this.px2MM(120), this.px2MM(204), {
          width: this.px2MM(500),
          height: this.px2MM(500),
        });

        //Table

        pdf
          .fillColor(this.hex2RGB('#ffffff'))
          .lineWidth(this.px2MM(0.2))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(690),
            this.px2MM(317),
            this.px2MM(397 + 295),
            this.px2MM(72),
          )
          .fillAndStroke();

        pdf
          .font('LeagueSpartan-SemiBold', this.px2MM(24))
          .fillColor(this.hex2RGB('#1A1A1D'))
          .text('Incomes', this.px2MM(710), this.px2MM(341), {
            width: this.px2MM(257),
            height: this.px2MM(32),
            align: 'left',
          });


        pdf
          .fillColor(this.hex2RGB('#ffffff'))
          .rect(
            this.px2MM(1380),
            this.px2MM(317),
            this.px2MM(177),
            this.px2MM(72),
          )
          .fillAndStroke();

        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .text('%', this.px2MM(1380), this.px2MM(341), {
            width: this.px2MM(177),
            height: this.px2MM(32),
            align: 'center',
          });

        pdf
          .fillColor(this.hex2RGB('#ffffff'))
          .rect(
            this.px2MM(1557),
            this.px2MM(317),
            this.px2MM(243),
            this.px2MM(72),
          )
          .fillAndStroke();

        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .text('Amount', this.px2MM(1577), this.px2MM(341), {
            width: this.px2MM(203),
            height: this.px2MM(32),
            align: 'right',
          });

        let rect_y = 389;
        let rect_gap = 62;
        let state_y = 408;
        let state_gap = 62;

        let y_high = this.mm2PX(pdf.y) + 20;
        let col = '#F3F6F9';

        for (
          let j = start;
          j < stop && j < Object.keys(assets_table).length;
          j++
        ) {
          try {
            if (!assets_table[j]['title']) {
              break;
            }
          } catch (error) {
            break;
          }

          if (j % 2 === 0) {
            col = '#F3F6F9';
          } else {
            col = '#FFFFFF';
          }

          pdf.font('LeagueSpartan-Regular');
          pdf
            .fillColor(this.hex2RGB(col))
            .fontSize(this.px2MM(24))
            .strokeColor(this.hex2RGB('#E9EAEE'))
            .rect(
              this.px2MM(690),
              this.px2MM(rect_y),
              this.px2MM(397 + 295),
              this.px2MM(62),
            )
            .fillAndStroke();

          pdf
            .fillColor(this.hex2RGB('#000000'))
            .text(
              assets_table[j]['title'].toString(),
              this.px2MM(710),
              this.px2MM(state_y),
              { width: this.px2MM(257), height: this.px2MM(32), align: 'left' },
            );


          pdf
            .fillColor(this.hex2RGB(col))
            .rect(
              this.px2MM(1380),
              this.px2MM(rect_y),
              this.px2MM(177),
              this.px2MM(62),
            )
            .fillAndStroke();
          if (!assets_table[j]['value']) {
            pdf
              .fillColor(this.hex2RGB('#000000'))
              .text('-', this.px2MM(1400), this.px2MM(state_y), {
                width: this.px2MM(137),
                height: this.px2MM(32),
                align: 'right',
              });
          } else {
            pdf
              .fillColor(this.hex2RGB('#000000'))
              .text(
                `${assets_pie[j]['percentage'].toFixed(2).toString()} %`,
                this.px2MM(1400),
                this.px2MM(state_y),
                {
                  width: this.px2MM(137),
                  height: this.px2MM(32),
                  align: 'right',
                },
              );
          }

          pdf
            .fillColor(this.hex2RGB(col))
            .rect(
              this.px2MM(1557),
              this.px2MM(rect_y),
              this.px2MM(243),
              this.px2MM(62),
            )
            .fillAndStroke();
          if (
            assets_table[j]['value'].toString() === '' ||
            parseInt(assets_table[j]['value'].toString()) === 0
          ) {
            pdf
              .fillColor(this.hex2RGB('#000000'))
              .text('₹ 0.0K', this.px2MM(1577), this.px2MM(state_y), {
                width: this.px2MM(203),
                height: this.px2MM(32),
                align: 'right',
              });
          } else {
            pdf
              .fillColor(this.hex2RGB('#000000'))
              .text(
                '₹ ' +
                this.format_cash2(
                  parseFloat(assets_table[j]['value'].toString()),
                ),
                this.px2MM(1577),
                this.px2MM(state_y),
                {
                  width: this.px2MM(203),
                  height: this.px2MM(32),
                  align: 'right',
                },
              );
          }

          rect_y += rect_gap;
          state_y += state_gap;
          y_high = this.mm2PX(pdf.y);

          if (j === Object.keys(assets_table).length - 1) {
            pdf.font('LeagueSpartan-SemiBold');

            pdf
              .fillColor(this.hex2RGB('#ffffff'))
              .fontSize(this.px2MM(24))
              .rect(
                this.px2MM(690),
                this.px2MM(rect_y),
                this.px2MM(297),
                this.px2MM(52),
              )
              .fill();

            pdf
              .fillColor(this.hex2RGB('#000000'))
              .text('Total', this.px2MM(710), this.px2MM(state_y - 5), {
                width: this.px2MM(257),
                height: this.px2MM(32),
                align: 'left',
              });

            pdf
              .fillColor(this.hex2RGB('#ffffff'))
              .rect(
                this.px2MM(987),
                this.px2MM(rect_y),
                this.px2MM(100),
                this.px2MM(52),
              )
              .fill();

            pdf
              .fillColor(this.hex2RGB('#ffffff'))
              .rect(
                this.px2MM(1087),
                this.px2MM(rect_y),
                this.px2MM(293),
                this.px2MM(52),
              )
              .fill();

            pdf
              .fillColor(this.hex2RGB('#ffffff'))
              .rect(
                this.px2MM(1380),
                this.px2MM(rect_y),
                this.px2MM(177),
                this.px2MM(52),
              )
              .fill();
            // if (!total_assets) {
            //   pdf
            //     .fillColor(this.hex2RGB('#000000'))
            //     .text('-', this.px2MM(1400), this.px2MM(state_y - 5), {
            //       width: this.px2MM(137),
            //       height: this.px2MM(32),
            //       align: 'right',
            //     });
            // } else {
            //   pdf
            //     .fillColor(this.hex2RGB('#000000'))
            //     .text(
            //       ' ' +
            //       this.format_cash2(
            //         parseFloat(total_assets.toString()),
            //       ).toString(),
            //       this.px2MM(1400),
            //       this.px2MM(state_y - 5),
            //       {
            //         width: this.px2MM(137),
            //         height: this.px2MM(32),
            //         align: 'right',
            //       },
            //     );
            // }

            pdf
              .fillColor(this.hex2RGB('#ffffff'))
              .rect(
                this.px2MM(1557),
                this.px2MM(rect_y),
                this.px2MM(243),
                this.px2MM(52),
              )
              .fill();
            if (
              !total_assets ||
              parseInt(assets_table[j]['value'].toString()) === 0
            ) {
              pdf
                .fillColor(this.hex2RGB('#000000'))
                .text('₹ 0.0K', this.px2MM(1577), this.px2MM(state_y - 5), {
                  width: this.px2MM(203),
                  height: this.px2MM(32),
                  align: 'right',
                });
            } else {
              pdf
                .fillColor(this.hex2RGB('#000000'))
                .text(
                  '₹ ' +
                  this.format_cash2(
                    parseFloat(
                      total_assets.toString(),
                    ),
                  ),
                  this.px2MM(1577),
                  this.px2MM(state_y),
                  {
                    width: this.px2MM(203),
                    height: this.px2MM(32),
                    align: 'right',
                  },
                );
            }
          }
        }

        let circle_y: number = 764;
        let common_gap: number = 42;
        let text_y: number = 758;

        for (let i = 0; i < Object.keys(assets_pie).length; i++) {
          pdf.fillColor(this.hex2RGB(assets_pie[i]['colors']));
          pdf
            .circle(this.px2MM(227), this.px2MM(circle_y), this.px2MM(10))
            .fill();

          pdf
            .font('LeagueSpartan-Regular')
            .fontSize(this.px2MM(24))
            .fillColor(this.hex2RGB('#ffffff'));
          pdf.text(
            `${assets_pie[i]['particular']}:`,
            this.px2MM(267),
            this.px2MM(text_y),
            { align: 'left', width: this.px2MM(250), height: this.px2MM(32) },
          );

          pdf.text(
            `${Math.round(assets_pie[i]['percentage'])}%`,
            this.px2MM(517),
            this.px2MM(text_y),
            { align: 'right', width: this.px2MM(80), height: this.px2MM(32) },
          );

          if (assets_pie[i]['particular'].length > 24) {
            circle_y += common_gap * 2;
            text_y += common_gap * 2;
          }

          circle_y += common_gap;
          text_y += common_gap;
        }

        start = stop;
        stop += 8;

        //index page
        this.index_text(pdf, '#1A1A1D');
      }
    } catch (err) {
      Logger.error(err);
    }
  }


  // async networthLinegraph(years, networth, cnwt) {
  //   try {
  //     const width = 606;
  //     const height = 335;

  //     const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
  //     const configuration = {
  //       type: 'line',
  //       data: {
  //         labels: years,
  //         datasets: [
  //           {
  //             data: [cnwt[0]],
  //             borderColor: 'black',
  //             borderWidth: 1,
  //             pointRadius: 8,
  //             fill: false,
  //             borderSkipped: 'bottom',
  //           },
  //           {
  //             data: [cnwt[0]],
  //             pointRadius: 4,
  //             pointBackgroundColor: 'black',
  //             fill: false,
  //             borderSkipped: 'bottom',
  //           },
  //           {
  //             data: cnwt,
  //             backgroundColor: 'rgba(255, 212, 203, 0.5)',
  //             borderColor: '#FF7051',
  //             borderWidth: 1,
  //             pointRadius: 0,
  //             fill: true,
  //             borderSkipped: 'bottom',
  //           },
  //           {
  //             data: networth,
  //             backgroundColor: 'rgba(212, 255, 237, 0.5)',
  //             borderColor: '#43D195',
  //             borderWidth: 1,
  //             pointRadius: 0,
  //             fill: true,
  //             borderSkipped: 'bottom',
  //           },
  //         ],
  //       },

  //       options: {
  //         responsive: true,
  //         maintainAspectRatio: false,
  //         scales: {
  //           x: {
  //             beginAtZero: true,
  //             ticks: {
  //               autoSkip: true,
  //               maxTicksLimit: 10,
  //               maxRotation: 0,
  //               minRotation: 0,
  //             },
  //             grid: {
  //               color: 'rgba(243, 246, 249, 0.1)',
  //             },
  //           },
  //           y: {
  //             beginAtZero: true,
  //             ticks: {
  //               // callback: function (value, index, values) {
  //               //   // Show only every nth label
  //               //   return index % Math.ceil(values.length / 7) === 0 ? `₹ ${value} Cr ` : '';
  //               // },
  //               callback: (value) => `₹ ${value} Cr`,
  //               autoSkip: true,
  //               maxTicksLimit: 8,
  //             },
  //             grid: {
  //               color: 'rgba(243, 246, 249, 0.1)',
  //             },
  //           },
  //         },
  //         plugins: {
  //           legend: {
  //             display: false,
  //           },
  //         },
  //       },
  //     };
  //     const image = await chartJSNodeCanvas.renderToDataURL(configuration);

  //     return image;
  //   } catch (err) {
  //     Logger.error(err);
  //   }
  // }

  // async netWorth(pdf: PDFKit.PDFDocument, jsondata: any) {
  //   try {
  //     const net_worth_projection = jsondata?.networth;

  //     pdf.addPage();
  //     pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  //     pdf.scale(this.scale_pdf() || 1.6572658674215652);
  //     pdf
  //       .fillColor(this.hex2RGB('#FCF8ED'))
  //       .rect(0, 0, this.px2MM(1920), this.px2MM(1080))
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .rect(0, this.px2MM(80), this.px2MM(15), this.px2MM(84))
  //       .fill();

  //     pdf
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(60))
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .text('Net Worth', this.px2MM(120), this.px2MM(92), {
  //         width: this.px2MM(589),
  //         height: this.px2MM(84),
  //         align: 'left',
  //       });

  //     this.index_text(pdf, '#1A1A1D');
  //     let chart_main_box_x = 120;
  //     let chart_main_box_y = 204;
  //     let chart_main_box_width = 812;
  //     let chart_main_box_height = 389;

  //     pdf.fillColor(this.hex2RGB('#ffffff'));
  //     pdf
  //       .rect(
  //         this.px2MM(chart_main_box_x),
  //         this.px2MM(chart_main_box_y),
  //         this.px2MM(chart_main_box_width),
  //         this.px2MM(chart_main_box_height),
  //       )
  //       .fill();

  //     pdf.fillColor(this.hex2RGB('#65676D'));
  //     pdf
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(40))
  //       .text(
  //         'Net Worth',
  //         this.px2MM(chart_main_box_x + 60),
  //         this.px2MM(chart_main_box_y + 122),
  //         { width: this.px2MM(315), height: this.px2MM(57), align: 'left' },
  //       );
  //     const net_worth = jsondata?.networth;

  //     const total_assets = `₹ ${this.format_cash2(
  //       parseFloat(net_worth?.assets),
  //     )}`;
  //     pdf.fillColor(this.hex2RGB('#000000'));

  //     pdf
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(72))
  //       .text(
  //         `${total_assets}`,
  //         this.px2MM(chart_main_box_x + 60),
  //         this.px2MM(chart_main_box_y + 202),
  //         { width: this.px2MM(280), height: this.px2MM(68), align: 'left' },
  //       );
  //     let Ind_width = 60;
  //     let Ind_height = 55;
  //     pdf.image(
  //       path.join(
  //         cwd,
  //         'src',
  //         'lib',
  //         'shared',
  //         'assets',
  //         'images',
  //         'icons',
  //         'ArrowUp.png',
  //       ),
  //       this.px2MM(chart_main_box_x + 290),
  //       this.px2MM(chart_main_box_y + 212),
  //       { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
  //     );

  //     pdf.fillColor(this.hex2RGB('#B9BABE'));
  //     pdf
  //       .rect(
  //         this.px2MM(chart_main_box_x + 395),
  //         this.px2MM(chart_main_box_y + 75),
  //         this.px2MM(1),
  //         this.px2MM(237),
  //       )
  //       .fill();

  //     Ind_width = 22;
  //     Ind_height = 30;
  //     pdf.fillColor(this.hex2RGB('#898B90'));
  //     pdf
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(30))
  //       .text(
  //         'Total Assets',
  //         this.px2MM(chart_main_box_x + 415),
  //         this.px2MM(chart_main_box_y + 75),
  //         { width: this.px2MM(315), height: this.px2MM(42), align: 'left' },
  //       );
  //     pdf
  //       .fillColor(this.hex2RGB('#898B90'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(35))
  //       .text(
  //         `${total_assets}`,
  //         this.px2MM(chart_main_box_x + 415),
  //         this.px2MM(chart_main_box_y + 128),
  //         { width: this.px2MM(315), height: this.px2MM(54), align: 'left' },
  //       );
  //     let IndicatorColor = ColorEnum.INDICATOR_UP;
  //     pdf
  //       .fillColor(this.hex2RGB(IndicatorColor))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       //TODO: Change this to correct value
  //       .text(
  //         `${total_assets}`,
  //         this.px2MM(chart_main_box_x + 551),
  //         this.px2MM(chart_main_box_y + 132),
  //         { width: this.px2MM(100), height: this.px2MM(54), align: 'left' },
  //       );
  //     pdf.image(
  //       path.join(
  //         cwd,
  //         'src',
  //         'lib',
  //         'shared',
  //         'assets',
  //         'images',
  //         'icons',
  //         'ArrowUp.png',
  //       ),
  //       this.px2MM(chart_main_box_x + 630),
  //       this.px2MM(chart_main_box_y + 129),
  //       { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
  //     );

  //     pdf.fillColor(this.hex2RGB('#898B90'));
  //     pdf
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(30))
  //       .text(
  //         'Total Liabilities',
  //         this.px2MM(chart_main_box_x + 415),
  //         this.px2MM(chart_main_box_y + 220),
  //         { width: this.px2MM(315), height: this.px2MM(42), align: 'left' },
  //       );
  //     pdf
  //       .fillColor(this.hex2RGB('#898B90'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(35))
  //       .text(
  //         `${total_assets}`,
  //         this.px2MM(chart_main_box_x + 415),
  //         this.px2MM(chart_main_box_y + 272),
  //         { width: this.px2MM(315), height: this.px2MM(54), align: 'left' },
  //       );
  //     IndicatorColor = ColorEnum.INDICATOR_UP;
  //     pdf
  //       .fillColor(this.hex2RGB(IndicatorColor))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       //TODO: Change this to correct value
  //       .text(
  //         `${total_assets}`,
  //         this.px2MM(chart_main_box_x + 551),
  //         this.px2MM(chart_main_box_y + 277),
  //         { width: this.px2MM(100), height: this.px2MM(54), align: 'left' },
  //       );

  //     pdf.image(
  //       path.join(
  //         cwd,
  //         'src',
  //         'lib',
  //         'shared',
  //         'assets',
  //         'images',
  //         'icons',
  //         'ArrowUp.png',
  //       ),
  //       this.px2MM(chart_main_box_x + 630),
  //       this.px2MM(chart_main_box_y + 274),
  //       { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
  //     );

  //     chart_main_box_x = 120;
  //     chart_main_box_y = 204 + chart_main_box_height;
  //     chart_main_box_width = 812;
  //     chart_main_box_height = 96;

  //     pdf.fillColor(this.hex2RGB('#D4FFED'));
  //     pdf
  //       .rect(
  //         this.px2MM(chart_main_box_x),
  //         this.px2MM(chart_main_box_y),
  //         this.px2MM(chart_main_box_width),
  //         this.px2MM(chart_main_box_height),
  //       )
  //       .fill();

  //     pdf.fillColor(this.hex2RGB('#000000'));
  //     pdf
  //       .font('LeagueSpartan-Light')
  //       .fontSize(this.px2MM(30))
  //       .text(
  //         'Currently your Net Worth has increased by ',
  //         this.px2MM(chart_main_box_x),
  //         this.px2MM(chart_main_box_y + 30),
  //         {
  //           width: this.px2MM(chart_main_box_width - 100),
  //           height: this.px2MM(42),
  //           align: 'center',
  //         },
  //       );
  //     pdf
  //       .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(40))
  //       //TODO: Change this to correct value
  //       .text(
  //         '15%',
  //         this.px2MM(chart_main_box_x + 625),
  //         this.px2MM(chart_main_box_y + 27),
  //         { width: this.px2MM(100), height: this.px2MM(54), align: 'left' },
  //       );

  //     chart_main_box_x = 120;
  //     chart_main_box_y = chart_main_box_y + chart_main_box_height + 50;
  //     chart_main_box_width = 812;
  //     chart_main_box_height = 228;

  //     pdf.fillColor(this.hex2RGB('#ffffff'));
  //     pdf
  //       .rect(
  //         this.px2MM(chart_main_box_x),
  //         this.px2MM(chart_main_box_y),
  //         this.px2MM(chart_main_box_width),
  //         this.px2MM(chart_main_box_height),
  //       )
  //       .fill();

  //     pdf.fillColor(this.hex2RGB('#000000'));
  //     pdf
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(40))
  //       .text(
  //         `Value Under Advisory: ₹ ${'000Cr'} `,
  //         this.px2MM(chart_main_box_x + 75),
  //         this.px2MM(chart_main_box_y + 60),
  //         {
  //           width: this.px2MM(660),
  //           height: this.px2MM(42),
  //           align: 'left',
  //           continued: true,
  //         },
  //       )
  //       .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(28))
  //       //TODO: Change this to correct value
  //       .text(
  //         `₹ ${this.format_cash2(parseFloat('1588989'))}`,
  //         this.px2MM(chart_main_box_x + 75),
  //         this.px2MM(chart_main_box_y + 68),
  //         { height: this.px2MM(54), align: 'right', continued: false },
  //       );
  //     Ind_width = 60;
  //     Ind_height = 52;
  //     pdf.image(
  //       path.join(
  //         cwd,
  //         'src',
  //         'lib',
  //         'shared',
  //         'assets',
  //         'images',
  //         'icons',
  //         'ArrowUp.png',
  //       ),
  //       this.px2MM(chart_main_box_x + 695),
  //       this.px2MM(chart_main_box_y + 56),
  //       { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
  //     );
  //     pdf
  //       .fillColor(this.hex2RGB('#4B4C51'))
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         `Value Under Advisory = Assets + Liabilities`,
  //         this.px2MM(chart_main_box_x + 92.5),
  //         this.px2MM(chart_main_box_y + 136),
  //         { width: this.px2MM(627), height: this.px2MM(30), align: 'center' },
  //       );

  //     chart_main_box_x = 992;
  //     chart_main_box_y = 204;
  //     chart_main_box_width = 808;
  //     chart_main_box_height = 762;

  //     pdf.fillColor(this.hex2RGB('#ffffff'));
  //     pdf
  //       .rect(
  //         this.px2MM(chart_main_box_x),
  //         this.px2MM(chart_main_box_y),
  //         this.px2MM(chart_main_box_width),
  //         this.px2MM(chart_main_box_height),
  //       )
  //       .fill();

  //     const years = jsondata?.networth?.networth_projection?.table.map(
  //       (item) => item.year,
  //     );

  //     const networth = jsondata?.networth?.networth_projection?.table.map(
  //       (item) => item.nwtet,
  //     );
  //     const cnwt = jsondata?.networth?.networth_projection?.table.map(
  //       (item) => item.cnwt,
  //     );

  //     const chartImage = await this.networthLinegraph(years, networth, cnwt);

  //     pdf.image(
  //       chartImage,
  //       this.px2MM(chart_main_box_x + 40),
  //       this.px2MM(chart_main_box_y + 40),
  //       {
  //         width: this.px2MM(chart_main_box_width - 94),
  //         height: this.px2MM(364),
  //       },
  //     );

  //     pdf
  //       .fillColor(this.hex2RGB('#FF7051'))
  //       .rect(
  //         this.px2MM(chart_main_box_x + 50),
  //         this.px2MM(chart_main_box_y + 450),
  //         this.px2MM(12),
  //         this.px2MM(12),
  //       )
  //       .fill();

  //     pdf.fillColor(this.hex2RGB('#000000'));
  //     pdf
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Current Net Worth Trajectory (CNWT)',
  //         this.px2MM(chart_main_box_x + 77),
  //         this.px2MM(chart_main_box_y + 444),
  //         { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
  //       );

  //     const maxCurr_cnwt = this.format_cash2(
  //       net_worth_projection?.networth_projection['retirement_cnwt'],
  //     );
  //     const mnth_cnwt =
  //       net_worth_projection?.networth_projection?.retirement_month_year
  //         ?.split(' ')[0]
  //         .toUpperCase()
  //         .slice(0, 3) +
  //       `'${net_worth_projection?.networth_projection?.retirement_month_year?.split(
  //         ' ',
  //       )[1]
  //       }' | ₹ ${maxCurr_cnwt}`;

  //     pdf.fillColor(this.hex2RGB('#898B90'));
  //     pdf
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         mnth_cnwt,
  //         this.px2MM(chart_main_box_x + 77),
  //         this.px2MM(chart_main_box_y + 481),
  //         { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
  //       );

  //     pdf.fillColor(this.hex2RGB('#000000'));
  //     pdf
  //       .font('LeagueSpartan-Light')
  //       .fontSize(this.px2MM(18))
  //       .text(
  //         'Assumes that you maintain your current financial habits until retirement.',
  //         this.px2MM(chart_main_box_x + 77),
  //         this.px2MM(chart_main_box_y + 518),
  //         { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
  //       );

  //     pdf
  //       .fillColor(this.hex2RGB('#43D195'))
  //       .rect(
  //         this.px2MM(chart_main_box_x + 50),
  //         this.px2MM(chart_main_box_y + 579),
  //         this.px2MM(12),
  //         this.px2MM(12),
  //       )
  //       .fill();

  //     pdf.fillColor(this.hex2RGB('#000000'));
  //     pdf
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Net worth Trajectory With Effective Planning (NWTEP)',
  //         this.px2MM(chart_main_box_x + 77),
  //         this.px2MM(chart_main_box_y + 573),
  //         { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
  //       );

  //     pdf.fillColor(this.hex2RGB('#898B90'));
  //     const maxCurr = this.format_cash2(
  //       net_worth_projection?.networth_projection['retirement_nwtet'],
  //     );
  //     const mnth =
  //       net_worth_projection?.networth_projection?.retirement_month_year
  //         ?.split(' ')[0]
  //         .toUpperCase()
  //         .slice(0, 3) +
  //       `'${net_worth_projection?.networth_projection?.retirement_month_year?.split(
  //         ' ',
  //       )[1]
  //       }' | ₹ ${maxCurr}`;
  //     // console.log(mnth);
  //     pdf
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         mnth,
  //         this.px2MM(chart_main_box_x + 77),
  //         this.px2MM(chart_main_box_y + 610),
  //         { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
  //       );

  //     pdf.fillColor(this.hex2RGB('#000000'));
  //     pdf
  //       .font('LeagueSpartan-Light')
  //       .fontSize(this.px2MM(18))
  //       .text(
  //         "Assumes that your finances are aligned with your personality by following the ideal guidance provided on the 'Your Financial Analysis' pages on the following aspects: expense and liability management, asset allocation, and emergency planning.",
  //         this.px2MM(chart_main_box_x + 77),
  //         this.px2MM(chart_main_box_y + 647),
  //         {
  //           width: this.px2MM(559),
  //           lineGap: this.px2MM(4),
  //           height: this.px2MM(100),
  //           align: 'left',
  //         },
  //       );
  //     // console.log(net_worth_projection)
  //   } catch (err) {
  //     Logger.error(err);
  //   }
  // }

  // async liability_management(pdf: PDFKit.PDFDocument, jsondata: any) {
  //   try {
  //     const liability_management = jsondata?.liability_management;
  //     const liability_management_table = liability_management?.table;
  //     const liability_management_total = liability_management?.total;
  //     const liability_management_comments = liability_management?.comments;

  //     const credit_score_analysis =
  //       jsondata?.bureau_report_summary?.credit_score_analysis;
  //     const credit_score = credit_score_analysis?.score;
  //     const credit_score_comments = credit_score_analysis?.commentary;

  //     if (!liability_management_table) return;

  //     pdf.addPage();
  //     pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  //     pdf.scale(this.scale_pdf() || 1.6572658674215652);

  //     pdf
  //       .fillColor(this.hex2RGB('#FCF8ED'))
  //       .rect(0, 0, this.px2MM(1920), this.px2MM(1080))
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .rect(0, this.px2MM(80), this.px2MM(15), this.px2MM(84))
  //       .fill();

  //     pdf

  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(60))
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .text('Liability Management', this.px2MM(120), this.px2MM(92), {
  //         width: this.px2MM(589),
  //         height: this.px2MM(84),
  //         align: 'left',
  //       });

  //     let lib_manag_main_box_x = 120;
  //     let lib_manag_main_box_y = 228;

  //     pdf
  //       .fillColor(this.hex2RGB('#ffffff'))
  //       .rect(
  //         this.px2MM(lib_manag_main_box_x),
  //         this.px2MM(lib_manag_main_box_y),
  //         this.px2MM(416),
  //         this.px2MM(542),
  //       )
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Your Credit Score',
  //         this.px2MM(lib_manag_main_box_x + 108),
  //         this.px2MM(lib_manag_main_box_y + 32.5),
  //         { width: this.px2MM(200), height: this.px2MM(32), align: 'center' },
  //       );

  //     let score_ind_img = 'bad_credit';
  //     if (credit_score >= 800) {
  //       score_ind_img = 'outstanding_credit';
  //     } else if (credit_score > 665) {
  //       score_ind_img = 'excellent_credit';
  //     } else if (credit_score > 550) {
  //       score_ind_img = 'good_credit';
  //     } else if (credit_score > 360) {
  //       score_ind_img = 'improve_credit';
  //     } else {
  //       score_ind_img = 'bad_credit';
  //     }

  //     pdf.image(
  //       path.join(
  //         cwd,
  //         `src/lib/shared/assets/images/credit_score/${score_ind_img}.png`,
  //       ),
  //       this.px2MM(lib_manag_main_box_x + 40),
  //       this.px2MM(lib_manag_main_box_y + 84.5),
  //       { width: this.px2MM(336), height: this.px2MM(239) },
  //     );

  //     pdf
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(75))
  //       .text(
  //         `${credit_score}`,
  //         this.px2MM(lib_manag_main_box_x + 128),
  //         this.px2MM(lib_manag_main_box_y + 210.5),
  //         { width: this.px2MM(160), height: this.px2MM(70), align: 'center' },
  //       );

  //     let changeScr = '5';
  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-Medium')
  //       .fontSize(this.px2MM(24))
  //       //TODO: Change this to correct value
  //       .text(
  //         `Increase in score - `,
  //         this.px2MM(lib_manag_main_box_x + 40),
  //         this.px2MM(lib_manag_main_box_y + 353.5),
  //         {
  //           width: this.px2MM(300),
  //           height: this.px2MM(70),
  //           align: 'center',
  //           continued: true,
  //         },
  //       )
  //       .font('LeagueSpartan-SemiBold')
  //       .fillColor(this.hex2RGB('#26A670'))
  //       .fontSize(this.px2MM(40))
  //       .text(
  //         `${changeScr}`,
  //         this.px2MM(lib_manag_main_box_x + 67),
  //         this.px2MM(lib_manag_main_box_y + 350),
  //       );

  //     let Ind_x = lib_manag_main_box_x + 40 + 270;
  //     Ind_x += changeScr.length >= 3 ? 30 : changeScr.length >= 2 ? 15 : 4;
  //     let Ind_width = 35;
  //     let Ind_height = 38;
  //     //TODO: Change this condition from 0 to correct value
  //     const Ind_dir = 0 ? 'ArrowDown.png' : 'ArrowUp.png';
  //     pdf.image(
  //       path.join(
  //         cwd,
  //         'src',
  //         'lib',
  //         'shared',
  //         'assets',
  //         'images',
  //         'icons',
  //         Ind_dir,
  //       ),
  //       this.px2MM(Ind_x),
  //       this.px2MM(lib_manag_main_box_y + 352),
  //       { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
  //     );

  //     let subtext_x = lib_manag_main_box_x + 40;
  //     let subtext_y = lib_manag_main_box_y + 429;

  //     pdf
  //       .fillColor(this.hex2RGB('#F3F6F9'))
  //       .rect(
  //         this.px2MM(subtext_x),
  //         this.px2MM(subtext_y),
  //         this.px2MM(336),
  //         this.px2MM(80),
  //       )
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(14))
  //       .text(
  //         `${credit_score_comments}`,
  //         this.px2MM(subtext_x + 20),
  //         this.px2MM(subtext_y + 10),
  //         {
  //           width: this.px2MM(300),
  //           height: this.px2MM(70),
  //           align: 'left',
  //           lineGap: this.px2MM(6),
  //         },
  //       );

  //     let main_table_x = 591;
  //     let main_table_y = 270;
  //     let header_width = 192;
  //     let header_h = 200;

  //     ////Label
  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .rect(
  //         this.px2MM(main_table_x - 6),
  //         this.px2MM(main_table_y - 42),
  //         this.px2MM(230),
  //         this.px2MM(42),
  //       )
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .font('LeagueSpartan-Regular')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Affordability Check',
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y - 42 + 9),
  //         { width: this.px2MM(224), height: this.px2MM(42), align: 'center' },
  //       );

  //     // Header Liabilities Type

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .rect(
  //         this.px2MM(main_table_x - 6),
  //         this.px2MM(main_table_y),
  //         this.px2MM(6),
  //         this.px2MM(header_h),
  //       )
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Liability Type',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 12),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     main_table_x += header_width;
  //     header_width = 508.5;
  //     header_h = 100;

  //     // Header

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Current Liability Distribution',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 24),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     main_table_y += header_h;
  //     header_width = 254.25;

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Outstanding',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 24),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     main_table_x += header_width;

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'EMI',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 24),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     main_table_y = 270;
  //     main_table_x += header_width;
  //     header_width = 508.5;

  //     // Header  Suggested Range

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Suggested Range',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 24),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     main_table_y += header_h;
  //     header_width = 254.25;

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'Loan Size',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 24),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     main_table_x += header_width;

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(main_table_x),
  //         this.px2MM(main_table_y),
  //         this.px2MM(header_width),
  //         this.px2MM(header_h),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         'EMI',
  //         this.px2MM(main_table_x + 20),
  //         this.px2MM(main_table_y + header_h / 2 - 24),
  //         {
  //           width: this.px2MM(header_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     ///////Body of the table

  //     let col_x = 591;
  //     let col_y = 470;
  //     let col_width = 192;
  //     let col_height = 100;

  //     for (let i = 0; i < liability_management_table.length; i++) {
  //       col_x = 591;
  //       col_width = 192;

  //       const bg_color = i % 2 == 0 ? '#F3F6F9' : '#FFFFFF';
  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .rect(
  //           this.px2MM(col_x - 6),
  //           this.px2MM(col_y),
  //           this.px2MM(6),
  //           this.px2MM(col_height),
  //         )
  //         .fill();

  //       pdf
  //         .fillColor(this.hex2RGB(bg_color))
  //         .lineWidth(0.5)
  //         .strokeColor(this.hex2RGB('#E9EAEE'))
  //         .rect(
  //           this.px2MM(col_x),
  //           this.px2MM(col_y),
  //           this.px2MM(col_width),
  //           this.px2MM(col_height),
  //         )
  //         .fillAndStroke();

  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .font('LeagueSpartan-Regular')
  //         .fontSize(this.px2MM(24))
  //         .text(
  //           `${liability_management_table[i]['liability_type']}`,
  //           this.px2MM(col_x + 20),
  //           this.px2MM(col_y + col_height / 2 - 12),
  //           {
  //             width: this.px2MM(col_width - 40),
  //             height: this.px2MM(32),
  //             align: 'left',
  //           },
  //         );

  //       col_x += col_width;
  //       col_width = 254.25;

  //       pdf
  //         .fillColor(this.hex2RGB(bg_color))
  //         .lineWidth(0.5)
  //         .strokeColor(this.hex2RGB('#E9EAEE'))
  //         .rect(
  //           this.px2MM(col_x),
  //           this.px2MM(col_y),
  //           this.px2MM(col_width),
  //           this.px2MM(col_height),
  //         )
  //         .fillAndStroke();

  //       const current_liability_distribution_outstanding_percentage =
  //         this.format_cash2(
  //           parseFloat(
  //             liability_management_table[i][
  //             'current_liability_distribution_outstanding_percentage'
  //             ],
  //           ),
  //         );
  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .font('LeagueSpartan-Regular')
  //         .fontSize(this.px2MM(24))
  //         .text(
  //           `₹${current_liability_distribution_outstanding_percentage}`,
  //           this.px2MM(col_x + 20),
  //           this.px2MM(col_y + col_height / 2 - 12),
  //           {
  //             width: this.px2MM(col_width - 40),
  //             height: this.px2MM(32),
  //             align: 'center',
  //           },
  //         );

  //       col_x += col_width;

  //       pdf
  //         .fillColor(this.hex2RGB(bg_color))
  //         .lineWidth(0.5)
  //         .strokeColor(this.hex2RGB('#E9EAEE'))
  //         .rect(
  //           this.px2MM(col_x),
  //           this.px2MM(col_y),
  //           this.px2MM(col_width),
  //           this.px2MM(col_height),
  //         )
  //         .fillAndStroke();

  //       const current_liability_distribution_emi_percentage = this.format_cash2(
  //         parseFloat(
  //           liability_management_table[i][
  //           'current_liability_distribution_emi_percentage'
  //           ],
  //         ),
  //       );
  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .font('LeagueSpartan-Regular')
  //         .fontSize(this.px2MM(24))
  //         .text(
  //           `₹${current_liability_distribution_emi_percentage}`,
  //           this.px2MM(col_x + 20),
  //           this.px2MM(col_y + col_height / 2 - 12),
  //           {
  //             width: this.px2MM(col_width - 40),
  //             height: this.px2MM(32),
  //             align: 'center',
  //           },
  //         );

  //       col_x += col_width;

  //       pdf
  //         .fillColor(this.hex2RGB(bg_color))
  //         .lineWidth(0.5)
  //         .strokeColor(this.hex2RGB('#E9EAEE'))
  //         .rect(
  //           this.px2MM(col_x),
  //           this.px2MM(col_y),
  //           this.px2MM(col_width),
  //           this.px2MM(col_height),
  //         )
  //         .fillAndStroke();

  //       const suggested_loan_size_range = liability_management_table?.[i]?.[
  //         'suggested_loan_size_range'
  //       ]
  //         .split('to')
  //         .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
  //         .join(' to ');
  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .font('LeagueSpartan-Regular')
  //         .fontSize(this.px2MM(24))
  //         .text(
  //           `${suggested_loan_size_range}`,
  //           this.px2MM(col_x + 20),
  //           this.px2MM(col_y + col_height / 2 - 12),
  //           {
  //             width: this.px2MM(col_width - 40),
  //             height: this.px2MM(32),
  //             align: 'center',
  //           },
  //         );

  //       col_x += col_width;

  //       pdf
  //         .fillColor(this.hex2RGB(bg_color))
  //         .lineWidth(0.5)
  //         .strokeColor(this.hex2RGB('#E9EAEE'))
  //         .rect(
  //           this.px2MM(col_x),
  //           this.px2MM(col_y),
  //           this.px2MM(col_width),
  //           this.px2MM(col_height),
  //         )
  //         .fillAndStroke();

  //       const suggested_emi_range = liability_management_table?.[i]?.[
  //         'suggested_emi_range'
  //       ]
  //         .split('to')
  //         .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
  //         .join(' to ');
  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .font('LeagueSpartan-Regular')
  //         .fontSize(this.px2MM(24))
  //         .text(
  //           `${suggested_emi_range}`,

  //           this.px2MM(col_x + 20),
  //           this.px2MM(col_y + col_height / 2 - 12),
  //           {
  //             width: this.px2MM(col_width - 40),
  //             height: this.px2MM(32),
  //             align: 'center',
  //           },
  //         );

  //       col_y += col_height;
  //     }

  //     //////////////Total

  //     col_x = 591;
  //     col_width = 192;

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .rect(
  //         this.px2MM(col_x - 6),
  //         this.px2MM(col_y),
  //         this.px2MM(6),
  //         this.px2MM(col_height),
  //       )
  //       .fill();

  //     pdf
  //       .fillColor(this.hex2RGB('#FFFFFF'))
  //       .lineWidth(0.5)
  //       .strokeColor(this.hex2RGB('#E9EAEE'))
  //       .rect(
  //         this.px2MM(col_x),
  //         this.px2MM(col_y),
  //         this.px2MM(1209),
  //         this.px2MM(col_height),
  //       )
  //       .fillAndStroke();

  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-Medium')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         `${liability_management_total['liability_type']}`,
  //         this.px2MM(col_x + 20),
  //         this.px2MM(col_y + col_height / 2 - 12),
  //         {
  //           width: this.px2MM(col_width - 40),
  //           height: this.px2MM(32),
  //           align: 'left',
  //         },
  //       );

  //     col_x += col_width;
  //     col_width = 254.25;

  //     const current_liability_distribution_outstanding_total =
  //       this.format_cash2(
  //         parseFloat(
  //           liability_management_total[
  //           'current_liability_distribution_outstanding_percentage'
  //           ],
  //         ),
  //       );
  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-Medium')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         `₹${current_liability_distribution_outstanding_total}`,
  //         this.px2MM(col_x + 20),
  //         this.px2MM(col_y + col_height / 2 - 12),
  //         {
  //           width: this.px2MM(col_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     col_x += col_width;

  //     const current_liability_distribution_emi_percentage = this.format_cash2(
  //       parseFloat(
  //         liability_management_total[
  //         'current_liability_distribution_emi_percentage'
  //         ],
  //       ),
  //     );
  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-Medium')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         `₹${current_liability_distribution_emi_percentage}`,
  //         this.px2MM(col_x + 20),
  //         this.px2MM(col_y + col_height / 2 - 12),
  //         {
  //           width: this.px2MM(col_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     col_x += col_width;

  //     const suggested_loan_size_range = liability_management_total?.[
  //       'suggested_loan_size_range'
  //     ]
  //       .split('to')
  //       .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
  //       .join(' to ');
  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-Medium')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         `${suggested_loan_size_range}`,
  //         this.px2MM(col_x + 20),
  //         this.px2MM(col_y + col_height / 2 - 12),
  //         {
  //           width: this.px2MM(col_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     col_x += col_width;

  //     const suggested_emi_range = liability_management_total?.[
  //       'suggested_emi_range'
  //     ]
  //       .split('to')
  //       .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
  //       .join(' to ');
  //     pdf
  //       .fillColor(this.hex2RGB('#000000'))
  //       .font('LeagueSpartan-Medium')
  //       .fontSize(this.px2MM(24))
  //       .text(
  //         `${suggested_emi_range}`,
  //         this.px2MM(col_x + 20),
  //         this.px2MM(col_y + col_height / 2 - 12),
  //         {
  //           width: this.px2MM(col_width - 40),
  //           height: this.px2MM(32),
  //           align: 'center',
  //         },
  //       );

  //     //////Comments

  //     let text_x = 120;

  //     let text_y = 810;
  //     let text_width = 1680;
  //     let text_height = 42;

  //     pdf
  //       .fillColor(this.hex2RGB('#1A1A1D'))
  //       .font('LeagueSpartan-SemiBold')
  //       .fontSize(this.px2MM(32))
  //       .text('Comments', this.px2MM(text_x), this.px2MM(text_y), {
  //         width: this.px2MM(text_width),
  //         height: this.px2MM(text_height),
  //         align: 'left',
  //       });

  //     text_y += text_height + 20;

  //     pdf.y = this.px2MM(text_y);

  //     for (let i = 0; i < liability_management_comments.length; i++) {
  //       pdf
  //         .fillColor(this.hex2RGB('#000000'))
  //         .rect(
  //           this.px2MM(text_x),
  //           this.px2MM(text_y + 7),
  //           this.px2MM(10),
  //           this.px2MM(10),
  //         )
  //         .fill();

  //       pdf
  //         .fillColor(this.hex2RGB('#1A1A1D'))
  //         .font('LeagueSpartan-Regular')
  //         .fontSize(this.px2MM(24))
  //         .text(
  //           `${liability_management_comments[i]}`,
  //           this.px2MM(text_x + 30),
  //           pdf.y,
  //           {
  //             width: this.px2MM(text_width),
  //             lineGap: this.px2MM(10),
  //             align: 'left',
  //           },
  //         );

  //       pdf.y += this.px2MM(20);
  //       text_y = this.mm2PX(pdf.y);
  //     }

  //     // index Text
  //     this.index_text(pdf, '#1A1A1D');
  //   } catch (err) {
  //     Logger.error(err);
  //   }
  // }


  async tax_liability_potential_saving(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      const tax_planning = jsondata?.tax_planning;
      if (!tax_planning) return;

      const tax_liability_comparison_table =
        tax_planning?.tax_liability_potential_saving
          ?.tax_liability_comparison_table;
      const tax_liability_comparison_current_table =
        tax_liability_comparison_table?.current;
      const tax_liability_comparison_after_planning_table =
        tax_liability_comparison_table?.after_planning;

      pdf.addPage();
      pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      pdf.scale(this.scale_pdf() || 1.6572658674215652);
      pdf
        .fillColor(this.hex2RGB('#FCF8ED'))
        .rect(0, 0, this.px2MM(1920), this.px2MM(1080))
        .fill();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .rect(0, this.px2MM(80), this.px2MM(15), this.px2MM(84))
        .fill();

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(60))
        .fillColor(this.hex2RGB('#1A1A1D'))
        .text(
          'Tax Liability & Potential Savings',
          this.px2MM(120),
          this.px2MM(92),
          { width: this.px2MM(807), height: this.px2MM(84), align: 'left' },
        );
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#1A1A1D'))
        //TODO: Change to correct text
        .text(
          `${tax_planning?.financial_year}`,
          this.px2MM(1380),
          this.px2MM(114),
          { width: this.px2MM(420), height: this.px2MM(32), align: 'right' },
        );

      let main_table_x = 400;
      let main_table_y = 200;
      let header_width = 403;
      let header_h = 121;

      // Header
      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Tax Camparison',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 12),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_x += header_width;
      header_width = 638.5;

      // Header

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .text(
          'Current',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_x += header_width;
      header_width = 638.5;

      // Header

      // pdf
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .rect(
      //     this.px2MM(main_table_x),
      //     this.px2MM(main_table_y),
      //     this.px2MM(header_width),
      //     this.px2MM(header_h),
      //   )
      //   .fill();

      // pdf
      //   .fillColor(this.hex2RGB('#1A1A1D'))
      //   .font('LeagueSpartan-SemiBold')
      //   .fontSize(this.px2MM(30))
      //   .text(
      //     'After Planning',
      //     this.px2MM(main_table_x + 20),
      //     this.px2MM(main_table_y + header_h / 2 - 24),
      //     {
      //       width: this.px2MM(header_width - 40),
      //       height: this.px2MM(32),
      //       align: 'center',
      //     },
      //   );

      // Table Body

      main_table_x = 400;
      main_table_y += header_h;
      header_width = 403;
      header_h = 112.5;

      const rows = [
        'Tax Regime',
        'Deductions',
        'Taxable Income',
        "Percentage",
        'Total Tax Payable',
      ];

      for (let i = 0; i < rows?.length; i++) {
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(24))
          .text(
            `${rows[i]}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2 - 12),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'left',
            },
          );

        main_table_y += header_h;
      }

      // Current Tax Regime OLD
      main_table_x += header_width;
      main_table_y = 325;
      header_width = 319.25;

      /// Current Tax Regime
      for (let i = 0; i < tax_liability_comparison_current_table?.length; i++) {
        //Regime Name

        let bgcolor = tax_liability_comparison_current_table?.[i]?.recommended
          ? '#DEF7F1'
          : '#FFFFFF';
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        if (tax_liability_comparison_current_table?.[i]?.recommended) {
          const opted_h = 36;
          pdf
            .fillColor(this.hex2RGB('#5bd7ba'))
            .rect(
              this.px2MM(main_table_x),
              this.px2MM(main_table_y),
              this.px2MM(header_width),
              this.px2MM(opted_h),
            )
            .fill();

          pdf
            .fillColor(this.hex2RGB('#4B4C51'))
            .font('LeagueSpartan-Medium')
            .fontSize(this.px2MM(18))
            .text(
              'RECOMMENDED',
              this.px2MM(main_table_x + 20),
              this.px2MM(main_table_y + opted_h / 2 - 9),
              {
                width: this.px2MM(header_width - 40),
                height: this.px2MM(32),
                align: 'center',
              },
            );
        }

        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(30))
          .text(
            `${tax_liability_comparison_current_table?.[i]?.tax_regime
              ?.split(' ')[0]
              .toUpperCase()}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        main_table_y += header_h;

        //Deduction
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        const deduction = tax_liability_comparison_current_table?.[i]
          ?.deductions
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_current_table?.[i]?.deductions,
            ),
          )}`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(24))
          //TODO recheck the value key
          .text(
            `${deduction}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2 - 12),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );


        main_table_y += header_h;

        //Percentage
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        const percentage = tax_liability_comparison_current_table?.[i]
          ?.percentage
          ? `${tax_liability_comparison_current_table?.[i]
            ?.percentage} %`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(24))
          //TODO recheck the value key
          .text(
            `${percentage}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2 - 12),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        main_table_y += header_h;

        //Taxable Income
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        const taxable_income = tax_liability_comparison_current_table?.[i]
          ?.taxable_income
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_current_table?.[i]?.taxable_income,
            ),
          )}`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(24))
          //TODO recheck the value key
          .text(
            `${taxable_income}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2 - 12),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );
        main_table_y += header_h;

        //Taxable Payable
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        const total_tax_payable = tax_liability_comparison_current_table?.[i]
          ?.total_tax_payable
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_current_table?.[i]?.total_tax_payable,
            ),
          )}`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(24))
          //TODO recheck the value key
          .text(
            `${total_tax_payable}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2 - 12),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        main_table_x += header_width;
        main_table_y = 325;
      }

    } catch (error) {
      Logger.error(error);
    }
  }



  last_page(pdf: PDFKit.PDFDocument) {
    try {
      let cwd = process.cwd();
      pdf.addPage();
      pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      pdf.scale(this.scale_pdf() || 1.6572658674215652);
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .rect(0, 0, this.px2MM(1920), this.px2MM(1080))
        .fill();
      const logoPath = path.join(
        cwd,
        'src/lib/shared/assets/images/logo/logo.png',
      );

      pdf.image(logoPath, this.px2MM(910), this.px2MM(162), {
        width: this.px2MM(100),
        height: this.px2MM(115.27),
      });

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(48))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text('FinAstra', this.px2MM(700), this.px2MM(308), {
          width: this.px2MM(520),
          align: 'center',
        });


      pdf
        .font('LeagueSpartan-Light')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(
          'Nitin Gupta   |   Nikhil Bhosele   |   Ruthvik Salunkhe   |   Samyak Doshi',
          this.px2MM(418),
          this.px2MM(460),
          {
            width: this.px2MM(1100),
            lineGap: this.px2MM(8),
            border: 0,
            align: 'center',
          },
        );

      // pdf.image(
      //   path.join(cwd, 'src/lib/shared/assets/images/icons/gmail.png'),
      //   this.px2MM(676.5),
      //   this.px2MM(602),
      //   { width: this.px2MM(32), height: this.px2MM(32) },
      // );
      // pdf
      //   .font('LeagueSpartan-SemiBold')
      //   .fontSize(this.px2MM(25.33))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .text('care@1finance.co.in', this.px2MM(724.5), this.px2MM(602), {
      //     border: 0,
      //     align: 'left',
      //   });

      // pdf.image(
      //   path.join(cwd, 'src/lib/shared/assets/images/icons/globe.png'),
      //   this.px2MM(966.5),
      //   this.px2MM(602),
      //   { width: this.px2MM(32), height: this.px2MM(32) },
      // );
      // pdf
      //   .font('LeagueSpartan-SemiBold')
      //   .fontSize(this.px2MM(24))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .text('https://1finance.co.in', this.px2MM(1014.5), this.px2MM(602), {
      //     border: 0,
      //     align: 'left',
      //   });
      // pdf
      //   .font('LeagueSpartan-SemiBold')
      //   .fontSize(this.px2MM(24))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .text(
      //     'Corresponding SEBI Local Office Address',
      //     this.px2MM(230),
      //     this.px2MM(674),
      //     {
      //       width: this.px2MM(1387),
      //       align: 'center',
      //       continued: true,
      //       lineGap: this.px2MM(8),
      //     },
      //   )
      //   .font('LeagueSpartan-Medium')
      //   .text(
      //     '\nSecurities and Exchange Board of India, Mumbai Regional Office, Mittal Court, A Wing, Gr. Floor, 224, Nariman Point, Mumbai - 400021',
      //     {
      //       width: this.px2MM(1387),
      //       align: 'center',
      //     },
      //   );

      // pdf.image(
      //   path.join(cwd, 'src/lib/shared/assets/images/icons/Line 3.png'),
      //   this.px2MM(110),
      //   this.px2MM(791),
      //   { width: this.px2MM(1700), height: this.px2MM(0.02) },
      // );

      // pdf
      //   .font('LeagueSpartan-Regular')
      //   .fontSize(this.px2MM(24))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .text(
      //     'CEO \nMr. Nitin Gupta\nEmail id : nitin@1finance.co.in\nContact No : +91 22 69120000',
      //     this.px2MM(108),
      //     this.px2MM(852),
      //     {
      //       width: this.px2MM(305),
      //       align: 'center',
      //       lineGap: this.px2MM(8),
      //     },
      //   );

      // pdf
      //   .font('LeagueSpartan-Regular')
      //   .fontSize(this.px2MM(24))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .text(
      //     'Chef Technology Officer\nMr. Nikhil Bhosele \nEmail id :nikhil.bhosele@1finance.co.in\nContact No : +91 22 69121150',
      //     this.px2MM(750),
      //     this.px2MM(852),
      //     {
      //       width: this.px2MM(420),
      //       align: 'center',
      //       lineGap: this.px2MM(8),
      //     },
      //   );

      // pdf
      //   .font('LeagueSpartan-Regular')
      //   .fontSize(this.px2MM(24))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   .text(
      //     'Intern Developer \nRuthvik Salunkhe\n1 FINANCE PRIVATE LIMITED \nDate : Mon Apr 01 11:27:59 IST 2024',
      //     this.px2MM(1459),
      //     this.px2MM(852),
      //     {
      //       width: this.px2MM(354),
      //       align: 'center',
      //       lineGap: this.px2MM(8),
      //     },
      //   );

      this.index_text(pdf, '#ffffff');
    } catch (error) {
      Logger.error(error);
    }
  }

  async generatePdf(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      this.page_index = 1;
      this.your_1_view_idx = 0;
      this.your_fin_analysis_idx = 0;
      this.your_fin_product_idx = 0;

      // const contentWidth = this.px2MM(1920);
      // const contentHeight = this.px2MM(1080);
      // const scaleX = pdf.page.width / contentWidth;
      // const scaleY = pdf.page.height / contentHeight;
      // const scale = Math.min(scaleX, scaleY);
      // console.log(pdf.page.width, pdf.page.height)

      // pdf.scale(this.scale_pdf() );

      // user_name =['name']
      const json_data = jsondata;
      console.log(json_data);
      const user_name = jsondata?.personal_info?.name || '';

      if (user_name?.trim() === '') {
        Logger.error('User name is empty');
      }
      const cwd = process.cwd();

      this.fwpHelper.registerFonts(pdf);

      pdf.fillColor(this.hex2RGB(ColorEnum.FININACIAL_ANALYSIS));
      pdf
        .rect(
          this.px2MM(1120),
          this.px2MM(0),
          this.px2MM(800),
          this.px2MM(1080),
        )
        .fill();
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'cover',
          'Union.png',
        ),
        this.px2MM(1146),
        this.px2MM(0),
        { width: this.px2MM(753), height: this.px2MM(1000) },
      );
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'cover',
          'Fin_Anal_Image.png',
        ),
        this.px2MM(1244),
        this.px2MM(367),
        { width: this.px2MM(552), height: this.px2MM(552) },
      );

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf.rect(0, 0, this.px2MM(1120), this.px2MM(1080)).fill();

      // const logoPath = path.join(
      //   cwd,
      //   'src',
      //   'lib',
      //   'shared',
      //   'assets',
      //   'images',
      //   'logo',
      //   'logo.png',
      // );
      // pdf.image(logoPath, this.px2MM(120), this.px2MM(80), {
      //   width: this.px2MM(98),
      //   height: this.px2MM(113),
      // });
      pdf
        .fillColor(this.hex2RGB(ColorEnum.FININACIAL_ANALYSIS))
        .rect(this.px2MM(0), this.px2MM(400), this.px2MM(20), this.px2MM(154))
        .fill();

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(110))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text('Tax Analysis', this.px2MM(120), this.px2MM(422));

      // Test of User name and Date
      let name_y = 680;

      // pdf
      //   .font('LeagueSpartan-Regular')
      //   .fontSize(this.px2MM(40))
      //   .fillColor(this.hex2RGB('#FFFFFF'))
      //   //TODO: Change the text to dynamic
      //   .text(
      //     '2nd Consultation Report',
      //     this.px2MM(120),
      //     this.px2MM(name_y + 16),
      //     {
      //       width: this.px2MM(1020),
      //       lineGap: 4,
      //       align: 'left',
      //     },
      //   );

      name_y = 820;
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(user_name, this.px2MM(120), this.px2MM(name_y + 16), {
          width: this.px2MM(1020),
          lineGap: 4,
          align: 'left',
        });
      const y_after_name = this.mm2PX(pdf.y);
      pdf
        .font('LeagueSpartan-Regular')
        .fillColor(this.hex2RGB(ColorEnum.FININACIAL_ANALYSIS));

      const Day = new Date().getDate();
      const month = new Date().toLocaleString('default', { month: 'short' });
      const year = new Date().getFullYear();

      let suffix = 'th';
      if ((Day >= 4 && Day <= 20) || (Day >= 24 && Day <= 30)) {
        suffix = 'th';
      } else {
        suffix = ['st', 'nd', 'rd'][(Day % 10) - 1];
      }

      pdf
        .font('LeagueSpartan-Light')
        .fontSize(this.px2MM(40))
        .text(`${Day}`, this.px2MM(120), this.px2MM(y_after_name + 8), {
          align: 'left',
          continued: true,
        })
        .fontSize(this.px2MM(25))
        .text(`${suffix} `, this.px2MM(120), this.px2MM(y_after_name + 8), {
          align: 'left',
          continued: true,
        })
        .fontSize(this.px2MM(40))
        .text(
          ` ${month}, ${year}`,
          this.px2MM(120),
          this.px2MM(y_after_name + 8),
          {
            align: 'left',
          },
        );

      this.oneView(pdf, jsondata);


      await this.assetsChart(pdf, jsondata);

      // await this.liabilitiesChart(pdf, jsondata);
      // await this.liability_management(pdf, jsondata);

      await this.tax_liability_potential_saving(pdf, jsondata);

      this.last_page(pdf);

      const contentsPdf = new PDFDocument({
        size: [474, 841.89],
        layout: 'landscape',
      });

      this.fwpHelper.registerFonts(contentsPdf);

      this.contentsPage(contentsPdf);

      //convert contentpage and pdf in buffer once complete

      const chunks: Buffer[] = [];
      contentsPdf.on('data', (chunk: Buffer) => chunks.push(chunk));

      const contentbuf = await new Promise<Buffer>((resolve, reject) => {
        contentsPdf.on('end', () => resolve(Buffer.concat(chunks)));
        contentsPdf.on('error', reject);
        contentsPdf.end();
      });

      const pdfchunks: Buffer[] = [];

      pdf.on('data', (chunk: Buffer) => pdfchunks.push(chunk));

      const mainpdfbuf = await new Promise<Buffer>((resolve, reject) => {
        pdf.on('end', () => resolve(Buffer.concat(pdfchunks)));
        pdf.on('error', reject);
        pdf.end();
      });

      // Load the buffers into PDFLIBDocuments
      const mainPdfDoc = await PDFLIBDocument.load(mainpdfbuf);
      const contentsPdfDoc = await PDFLIBDocument.load(contentbuf);

      // Copy the contents page
      const [contentsPage] = await mainPdfDoc.copyPages(
        contentsPdfDoc,
        contentsPdfDoc.getPageIndices(),
      );

      // Insert the contentsPage at index 1
      mainPdfDoc.insertPage(1, contentsPage);

      // Save the new PDF
      const newPdfBytes = await mainPdfDoc.save();

      const random = uuidv4();
      //TODO: Change the path to the server path
      // const outputPath = path.join(cwd, `/pdf_files/fwp_pdf/${random}FWP.pdf`);
      const outputPath = path.join(cwd, `/pdf_files/fwp_pdf/output.pdf`);

      fs.writeFileSync(outputPath, newPdfBytes);

      return outputPath;

      /////////////////////////////////

      // Saving the PDF in the server ms_pdf folder

      // const random = uuidv4();
      // const outputPath = path.join(cwd, `/pdf_files/fwp_pdf/${random}FWP.pdf`);
      // const writeStream = fs.createWriteStream(outputPath);
      // contentsPdf.pipe(writeStream);

      // return new Promise((resolve, reject) => {
      //   writeStream.on('finish', () => resolve(outputPath));
      //   writeStream.on('error', reject);
      //   contentsPdf.end();
      // });

      /////////////////////

      // const chunks: Buffer[] = [];
      // pdf.on('data', (chunk: Buffer) => chunks.push(chunk));

      // return new Promise((resolve, reject) => {
      //   pdf.on('end', () => resolve(Buffer.concat(chunks)));
      //   pdf.on('error', reject);
      //   pdf.end();
      // });
    } catch (err) {
      // console.log(err)
      Logger.error(err);
    }
  }

  async fwp_pdf(jsondata: any) {
    try {
      // const pdf = new PDFDocument({ size: 'A4', layout: 'landscape' });
      const pdf = new PDFDocument({ size: [474, 841.89], layout: 'landscape' });

      // const pdf = new PDFDocument({ size: [this.px2MM(1080), this.px2MM(1920)], layout: 'landscape' });
      pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      pdf.scale(this.scale_pdf() || 1.6572658674215652);

      const filepath = await this.generatePdf(pdf, jsondata);
      // console.log(filepath)
      if (fs.existsSync(filepath)) {
        const pdfData = await fs.readFileSync(filepath);
        return pdfData;
      } else {
        throw new Error('File does not exist');
      }

      // const chunks: Buffer[] = [];
      // pdf.on('data', (chunk: Buffer) => chunks.push(chunk));

      // return new Promise((resolve, reject) => {
      //   pdf.on('end', () => resolve(Buffer.concat(chunks)));
      //   pdf.on('error', reject);
      //   pdf.end();
      // });
    } catch (err) {
      Logger.error(err);
    }
  }
}
