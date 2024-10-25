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
      const assets = jsondata?.oneview?.assets || [];

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
          this.px2MM(520),
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
        .text('Assets', this.px2MM(240), this.px2MM(254), {
          width: this.px2MM(105),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .fillColor(this.hex2RGB('#000000'))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(jsondata['oneview']['total']['assets']),
          ),
          this.px2MM(395),
          this.px2MM(259),
          { width: this.px2MM(105), height: this.px2MM(42), align: 'left' },
        );
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(jsondata['oneview']['total']['assets']),
          ),
          this.px2MM(500),
          this.px2MM(262),
          { width: this.px2MM(80), height: this.px2MM(42), align: 'left' },
        );
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(575),
        this.px2MM(258),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(assets).length; rows++) {
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
            assets[rows]['title'],
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

        if (assets[rows]['value'] == ' ' || assets[rows]['value'] == '') {
          pdf.text('-', this.px2MM(470), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          assets[rows]['value'] == ' ' ||
          assets[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(470), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 455;
          const val = this.format_cash2(parseFloat(assets[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
          pdf.image(
            path.join(
              cwd,
              'src',
              'lib',
              'shared',
              'assets',
              'images',
              'icons',
              'ArrowUp.png',
            ),
            this.px2MM(val_x + 115),
            this.px2MM(342 + rows * 72),
            { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          );
        }
      }

      //card 2

      const liabilities = jsondata?.oneview?.liabilities || [];

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
        .text('Liabilities', this.px2MM(816), this.px2MM(254), {
          width: this.px2MM(244),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .fillColor(this.hex2RGB('#000000'))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(jsondata['oneview']['total']['liabilities']),
          ),
          this.px2MM(985),
          this.px2MM(259),
          { width: this.px2MM(105), height: this.px2MM(42), align: 'left' },
        );

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
        .text(
          '₹ ' +
          this.format_cash2(
            //TODO : change this to correct value
            parseFloat(jsondata['oneview']['total']['liabilities']),
          ),
          this.px2MM(1075),
          this.px2MM(262),
          { width: this.px2MM(80), height: this.px2MM(42), align: 'right' },
        );
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(1153),
        this.px2MM(259),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(liabilities).length; rows++) {
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
            liabilities[rows]['title'],
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
          liabilities[rows]['value'] == ' ' ||
          liabilities[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1046), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          liabilities[rows]['value'] == ' ' ||
          liabilities[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1046), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1031;
          const val = this.format_cash2(parseFloat(liabilities[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });

          pdf.image(
            path.join(
              cwd,
              'src',
              'lib',
              'shared',
              'assets',
              'images',
              'icons',
              'ArrowUp.png',
            ),
            this.px2MM(val_x + 115),
            this.px2MM(342 + rows * 72),
            { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          );
        }
      }

      //card 3

      const income = jsondata?.oneview?.income || [];

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
        .text('Income', this.px2MM(816), this.px2MM(608), {
          width: this.px2MM(155),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .fillColor(this.hex2RGB('#000000'))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(jsondata['oneview']['total']['income']),
          ),
          this.px2MM(970),
          this.px2MM(613),
          { width: this.px2MM(105), height: this.px2MM(42), align: 'left' },
        );

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
        .text(
          '₹ ' +
          this.format_cash2(
            //TODO : change this to correct value
            parseFloat(jsondata['oneview']['total']['income']),
          ),
          this.px2MM(1075),
          this.px2MM(616),
          { width: this.px2MM(80), height: this.px2MM(42), align: 'left' },
        );
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(1150),
        this.px2MM(613),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(income).length; rows++) {
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
            income[rows]['title'],
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

        if (income[rows]['value'] == ' ' || income[rows]['value'] == '') {
          pdf.text('-', this.px2MM(1046), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          income[rows]['value'] == ' ' ||
          income[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1046), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1031;
          const val = this.format_cash2(parseFloat(income[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });

          pdf.image(
            path.join(
              cwd,
              'src',
              'lib',
              'shared',
              'assets',
              'images',
              'icons',
              'ArrowUp.png',
            ),
            this.px2MM(val_x + 115),
            this.px2MM(701 + rows * 72),
            { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          );
        }
      }

      ///card 4

      const insurance = jsondata?.oneview?.insurance || [];

      pdf
        .fillColor(this.hex2RGB('#FFE7CC'))
        .rect(
          this.px2MM(1273),
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
        .text('Insurance', this.px2MM(1393), this.px2MM(254), {
          width: this.px2MM(158),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(insurance).length; rows++) {
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
            insurance[rows]['title'],
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

        if (insurance[rows]['value'] == ' ' || insurance[rows]['value'] == '') {
          pdf.text('-', this.px2MM(1623), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          insurance[rows]['value'] == ' ' ||
          insurance[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1623), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1608;
          const val = this.format_cash2(parseFloat(insurance[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(344 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
          pdf.image(
            path.join(
              cwd,
              'src',
              'lib',
              'shared',
              'assets',
              'images',
              'icons',
              'ArrowUp.png',
            ),
            this.px2MM(val_x + 115),
            this.px2MM(342 + rows * 72),
            { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          );
        }
      }

      //card 5

      const expense = jsondata?.oneview?.expense || [];

      pdf
        .fillColor(this.hex2RGB('#FFDDDA'))
        .rect(
          this.px2MM(1273),
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
          'Expense.png',
        ),
        this.px2MM(1313),
        this.px2MM(598),
        { width: this.px2MM(60), height: this.px2MM(60) },
      );

      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#000000'))
        .text('Expenses', this.px2MM(1393), this.px2MM(608), {
          width: this.px2MM(155),
          height: this.px2MM(56),
          align: 'left',
        });

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .fillColor(this.hex2RGB('#000000'))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(jsondata['oneview']['total']['expense']),
          ),
          this.px2MM(1562),
          this.px2MM(613),
          { width: this.px2MM(105), height: this.px2MM(42), align: 'right' },
        );

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
        .text(
          '₹ ' +
          this.format_cash2(
            parseFloat(jsondata['oneview']['total']['expense']),
          ),
          this.px2MM(1667),
          this.px2MM(616),
          { width: this.px2MM(80), height: this.px2MM(42), align: 'right' },
        );
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(1742),
        this.px2MM(613),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      pdf.fillColor(this.hex2RGB('#000000'));

      for (let rows = 0; rows < Object.keys(expense).length; rows++) {
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(1313),
            this.px2MM(678 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .fill();
        pdf
          .lineWidth(this.px2MM(1))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(1313),
            this.px2MM(678 + rows * 72),
            this.px2MM(290),
            this.px2MM(72),
          )
          .stroke();

        pdf
          .rect(
            this.px2MM(1603),
            this.px2MM(678 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .fill();
        pdf
          .lineWidth(this.px2MM(1))
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(1603),
            this.px2MM(678 + rows * 72),
            this.px2MM(157),
            this.px2MM(72),
          )
          .stroke();

        pdf
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#000000'))
          .text(
            expense[rows]['title'],
            this.px2MM(1333),
            this.px2MM(702 + rows * 72),
            { width: this.px2MM(250), height: this.px2MM(32), align: 'left' },
          );

        if (expense[rows]['value'] == ' ' || expense[rows]['value'] == '') {
          pdf.text('-', this.px2MM(1623), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else if (
          expense[rows]['value'] == ' ' ||
          expense[rows]['value'] == ''
        ) {
          pdf.text('-', this.px2MM(1623), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
        } else {
          const val_x = 1608;
          const val = this.format_cash2(parseFloat(expense[rows]['value']));
          pdf.text(`₹ ${val}`, this.px2MM(val_x), this.px2MM(702 + rows * 72), {
            width: this.px2MM(117),
            height: this.px2MM(25),
            align: 'right',
          });
          pdf.image(
            path.join(
              cwd,
              'src',
              'lib',
              'shared',
              'assets',
              'images',
              'icons',
              'ArrowUp.png',
            ),
            this.px2MM(val_x + 115),
            this.px2MM(701 + rows * 72),
            { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
          );
        }
      }

      const disclaimer =
        'Disclaimer: The accuracy and comprehensiveness of this information is dependent on the details provided to us. The more accurate the information, the better our financial suggestions will be.';
      pdf.fillColor(this.hex2RGB('#ffffff'));
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(disclaimer, this.px2MM(440), this.px2MM(976), {
          width: this.px2MM(1110),
          height: this.px2MM(64),
          lineGap: this.px2MM(4),
          align: 'center',
        });

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


  async networthLinegraph(years, networth, cnwt) {
    try {
      const width = 606;
      const height = 335;

      const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
      const configuration = {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            {
              data: [cnwt[0]],
              borderColor: 'black',
              borderWidth: 1,
              pointRadius: 8,
              fill: false,
              borderSkipped: 'bottom',
            },
            {
              data: [cnwt[0]],
              pointRadius: 4,
              pointBackgroundColor: 'black',
              fill: false,
              borderSkipped: 'bottom',
            },
            {
              data: cnwt,
              backgroundColor: 'rgba(255, 212, 203, 0.5)',
              borderColor: '#FF7051',
              borderWidth: 1,
              pointRadius: 0,
              fill: true,
              borderSkipped: 'bottom',
            },
            {
              data: networth,
              backgroundColor: 'rgba(212, 255, 237, 0.5)',
              borderColor: '#43D195',
              borderWidth: 1,
              pointRadius: 0,
              fill: true,
              borderSkipped: 'bottom',
            },
          ],
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                autoSkip: true,
                maxTicksLimit: 10,
                maxRotation: 0,
                minRotation: 0,
              },
              grid: {
                color: 'rgba(243, 246, 249, 0.1)',
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                // callback: function (value, index, values) {
                //   // Show only every nth label
                //   return index % Math.ceil(values.length / 7) === 0 ? `₹ ${value} Cr ` : '';
                // },
                callback: (value) => `₹ ${value} Cr`,
                autoSkip: true,
                maxTicksLimit: 8,
              },
              grid: {
                color: 'rgba(243, 246, 249, 0.1)',
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      };
      const image = await chartJSNodeCanvas.renderToDataURL(configuration);

      return image;
    } catch (err) {
      Logger.error(err);
    }
  }

  async netWorth(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      const net_worth_projection = jsondata?.networth;

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
        .text('Net Worth', this.px2MM(120), this.px2MM(92), {
          width: this.px2MM(589),
          height: this.px2MM(84),
          align: 'left',
        });

      this.index_text(pdf, '#1A1A1D');
      let chart_main_box_x = 120;
      let chart_main_box_y = 204;
      let chart_main_box_width = 812;
      let chart_main_box_height = 389;

      pdf.fillColor(this.hex2RGB('#ffffff'));
      pdf
        .rect(
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y),
          this.px2MM(chart_main_box_width),
          this.px2MM(chart_main_box_height),
        )
        .fill();

      pdf.fillColor(this.hex2RGB('#65676D'));
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .text(
          'Net Worth',
          this.px2MM(chart_main_box_x + 60),
          this.px2MM(chart_main_box_y + 122),
          { width: this.px2MM(315), height: this.px2MM(57), align: 'left' },
        );
      const net_worth = jsondata?.networth;

      const total_assets = `₹ ${this.format_cash2(
        parseFloat(net_worth?.assets),
      )}`;
      pdf.fillColor(this.hex2RGB('#000000'));

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(72))
        .text(
          `${total_assets}`,
          this.px2MM(chart_main_box_x + 60),
          this.px2MM(chart_main_box_y + 202),
          { width: this.px2MM(280), height: this.px2MM(68), align: 'left' },
        );
      let Ind_width = 60;
      let Ind_height = 55;
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(chart_main_box_x + 290),
        this.px2MM(chart_main_box_y + 212),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      pdf.fillColor(this.hex2RGB('#B9BABE'));
      pdf
        .rect(
          this.px2MM(chart_main_box_x + 395),
          this.px2MM(chart_main_box_y + 75),
          this.px2MM(1),
          this.px2MM(237),
        )
        .fill();

      Ind_width = 22;
      Ind_height = 30;
      pdf.fillColor(this.hex2RGB('#898B90'));
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(30))
        .text(
          'Total Assets',
          this.px2MM(chart_main_box_x + 415),
          this.px2MM(chart_main_box_y + 75),
          { width: this.px2MM(315), height: this.px2MM(42), align: 'left' },
        );
      pdf
        .fillColor(this.hex2RGB('#898B90'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(35))
        .text(
          `${total_assets}`,
          this.px2MM(chart_main_box_x + 415),
          this.px2MM(chart_main_box_y + 128),
          { width: this.px2MM(315), height: this.px2MM(54), align: 'left' },
        );
      let IndicatorColor = ColorEnum.INDICATOR_UP;
      pdf
        .fillColor(this.hex2RGB(IndicatorColor))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        //TODO: Change this to correct value
        .text(
          `${total_assets}`,
          this.px2MM(chart_main_box_x + 551),
          this.px2MM(chart_main_box_y + 132),
          { width: this.px2MM(100), height: this.px2MM(54), align: 'left' },
        );
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(chart_main_box_x + 630),
        this.px2MM(chart_main_box_y + 129),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      pdf.fillColor(this.hex2RGB('#898B90'));
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(30))
        .text(
          'Total Liabilities',
          this.px2MM(chart_main_box_x + 415),
          this.px2MM(chart_main_box_y + 220),
          { width: this.px2MM(315), height: this.px2MM(42), align: 'left' },
        );
      pdf
        .fillColor(this.hex2RGB('#898B90'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(35))
        .text(
          `${total_assets}`,
          this.px2MM(chart_main_box_x + 415),
          this.px2MM(chart_main_box_y + 272),
          { width: this.px2MM(315), height: this.px2MM(54), align: 'left' },
        );
      IndicatorColor = ColorEnum.INDICATOR_UP;
      pdf
        .fillColor(this.hex2RGB(IndicatorColor))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        //TODO: Change this to correct value
        .text(
          `${total_assets}`,
          this.px2MM(chart_main_box_x + 551),
          this.px2MM(chart_main_box_y + 277),
          { width: this.px2MM(100), height: this.px2MM(54), align: 'left' },
        );

      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(chart_main_box_x + 630),
        this.px2MM(chart_main_box_y + 274),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      chart_main_box_x = 120;
      chart_main_box_y = 204 + chart_main_box_height;
      chart_main_box_width = 812;
      chart_main_box_height = 96;

      pdf.fillColor(this.hex2RGB('#D4FFED'));
      pdf
        .rect(
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y),
          this.px2MM(chart_main_box_width),
          this.px2MM(chart_main_box_height),
        )
        .fill();

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf
        .font('LeagueSpartan-Light')
        .fontSize(this.px2MM(30))
        .text(
          'Currently your Net Worth has increased by ',
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y + 30),
          {
            width: this.px2MM(chart_main_box_width - 100),
            height: this.px2MM(42),
            align: 'center',
          },
        );
      pdf
        .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(40))
        //TODO: Change this to correct value
        .text(
          '15%',
          this.px2MM(chart_main_box_x + 625),
          this.px2MM(chart_main_box_y + 27),
          { width: this.px2MM(100), height: this.px2MM(54), align: 'left' },
        );

      chart_main_box_x = 120;
      chart_main_box_y = chart_main_box_y + chart_main_box_height + 50;
      chart_main_box_width = 812;
      chart_main_box_height = 228;

      pdf.fillColor(this.hex2RGB('#ffffff'));
      pdf
        .rect(
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y),
          this.px2MM(chart_main_box_width),
          this.px2MM(chart_main_box_height),
        )
        .fill();

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(40))
        .text(
          `Value Under Advisory: ₹ ${'000Cr'} `,
          this.px2MM(chart_main_box_x + 75),
          this.px2MM(chart_main_box_y + 60),
          {
            width: this.px2MM(660),
            height: this.px2MM(42),
            align: 'left',
            continued: true,
          },
        )
        .fillColor(this.hex2RGB(ColorEnum.INDICATOR_UP))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(28))
        //TODO: Change this to correct value
        .text(
          `₹ ${this.format_cash2(parseFloat('1588989'))}`,
          this.px2MM(chart_main_box_x + 75),
          this.px2MM(chart_main_box_y + 68),
          { height: this.px2MM(54), align: 'right', continued: false },
        );
      Ind_width = 60;
      Ind_height = 52;
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          'ArrowUp.png',
        ),
        this.px2MM(chart_main_box_x + 695),
        this.px2MM(chart_main_box_y + 56),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );
      pdf
        .fillColor(this.hex2RGB('#4B4C51'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(
          `Value Under Advisory = Assets + Liabilities`,
          this.px2MM(chart_main_box_x + 92.5),
          this.px2MM(chart_main_box_y + 136),
          { width: this.px2MM(627), height: this.px2MM(30), align: 'center' },
        );

      chart_main_box_x = 992;
      chart_main_box_y = 204;
      chart_main_box_width = 808;
      chart_main_box_height = 762;

      pdf.fillColor(this.hex2RGB('#ffffff'));
      pdf
        .rect(
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y),
          this.px2MM(chart_main_box_width),
          this.px2MM(chart_main_box_height),
        )
        .fill();

      const years = jsondata?.networth?.networth_projection?.table.map(
        (item) => item.year,
      );

      const networth = jsondata?.networth?.networth_projection?.table.map(
        (item) => item.nwtet,
      );
      const cnwt = jsondata?.networth?.networth_projection?.table.map(
        (item) => item.cnwt,
      );

      const chartImage = await this.networthLinegraph(years, networth, cnwt);

      pdf.image(
        chartImage,
        this.px2MM(chart_main_box_x + 40),
        this.px2MM(chart_main_box_y + 40),
        {
          width: this.px2MM(chart_main_box_width - 94),
          height: this.px2MM(364),
        },
      );

      pdf
        .fillColor(this.hex2RGB('#FF7051'))
        .rect(
          this.px2MM(chart_main_box_x + 50),
          this.px2MM(chart_main_box_y + 450),
          this.px2MM(12),
          this.px2MM(12),
        )
        .fill();

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Current Net Worth Trajectory (CNWT)',
          this.px2MM(chart_main_box_x + 77),
          this.px2MM(chart_main_box_y + 444),
          { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
        );

      const maxCurr_cnwt = this.format_cash2(
        net_worth_projection?.networth_projection['retirement_cnwt'],
      );
      const mnth_cnwt =
        net_worth_projection?.networth_projection?.retirement_month_year
          ?.split(' ')[0]
          .toUpperCase()
          .slice(0, 3) +
        `'${net_worth_projection?.networth_projection?.retirement_month_year?.split(
          ' ',
        )[1]
        }' | ₹ ${maxCurr_cnwt}`;

      pdf.fillColor(this.hex2RGB('#898B90'));
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(
          mnth_cnwt,
          this.px2MM(chart_main_box_x + 77),
          this.px2MM(chart_main_box_y + 481),
          { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
        );

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf
        .font('LeagueSpartan-Light')
        .fontSize(this.px2MM(18))
        .text(
          'Assumes that you maintain your current financial habits until retirement.',
          this.px2MM(chart_main_box_x + 77),
          this.px2MM(chart_main_box_y + 518),
          { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
        );

      pdf
        .fillColor(this.hex2RGB('#43D195'))
        .rect(
          this.px2MM(chart_main_box_x + 50),
          this.px2MM(chart_main_box_y + 579),
          this.px2MM(12),
          this.px2MM(12),
        )
        .fill();

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Net worth Trajectory With Effective Planning (NWTEP)',
          this.px2MM(chart_main_box_x + 77),
          this.px2MM(chart_main_box_y + 573),
          { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
        );

      pdf.fillColor(this.hex2RGB('#898B90'));
      const maxCurr = this.format_cash2(
        net_worth_projection?.networth_projection['retirement_nwtet'],
      );
      const mnth =
        net_worth_projection?.networth_projection?.retirement_month_year
          ?.split(' ')[0]
          .toUpperCase()
          .slice(0, 3) +
        `'${net_worth_projection?.networth_projection?.retirement_month_year?.split(
          ' ',
        )[1]
        }' | ₹ ${maxCurr}`;
      // console.log(mnth);
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(
          mnth,
          this.px2MM(chart_main_box_x + 77),
          this.px2MM(chart_main_box_y + 610),
          { width: this.px2MM(559), height: this.px2MM(32), align: 'left' },
        );

      pdf.fillColor(this.hex2RGB('#000000'));
      pdf
        .font('LeagueSpartan-Light')
        .fontSize(this.px2MM(18))
        .text(
          "Assumes that your finances are aligned with your personality by following the ideal guidance provided on the 'Your Financial Analysis' pages on the following aspects: expense and liability management, asset allocation, and emergency planning.",
          this.px2MM(chart_main_box_x + 77),
          this.px2MM(chart_main_box_y + 647),
          {
            width: this.px2MM(559),
            lineGap: this.px2MM(4),
            height: this.px2MM(100),
            align: 'left',
          },
        );
      // console.log(net_worth_projection)
    } catch (err) {
      Logger.error(err);
    }
  }

  async liability_management(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      const liability_management = jsondata?.liability_management;
      const liability_management_table = liability_management?.table;
      const liability_management_total = liability_management?.total;
      const liability_management_comments = liability_management?.comments;

      const credit_score_analysis =
        jsondata?.bureau_report_summary?.credit_score_analysis;
      const credit_score = credit_score_analysis?.score;
      const credit_score_comments = credit_score_analysis?.commentary;

      if (!liability_management_table) return;

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
        .text('Liability Management', this.px2MM(120), this.px2MM(92), {
          width: this.px2MM(589),
          height: this.px2MM(84),
          align: 'left',
        });

      let lib_manag_main_box_x = 120;
      let lib_manag_main_box_y = 228;

      pdf
        .fillColor(this.hex2RGB('#ffffff'))
        .rect(
          this.px2MM(lib_manag_main_box_x),
          this.px2MM(lib_manag_main_box_y),
          this.px2MM(416),
          this.px2MM(542),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Your Credit Score',
          this.px2MM(lib_manag_main_box_x + 108),
          this.px2MM(lib_manag_main_box_y + 32.5),
          { width: this.px2MM(200), height: this.px2MM(32), align: 'center' },
        );

      let score_ind_img = 'bad_credit';
      if (credit_score >= 800) {
        score_ind_img = 'outstanding_credit';
      } else if (credit_score > 665) {
        score_ind_img = 'excellent_credit';
      } else if (credit_score > 550) {
        score_ind_img = 'good_credit';
      } else if (credit_score > 360) {
        score_ind_img = 'improve_credit';
      } else {
        score_ind_img = 'bad_credit';
      }

      pdf.image(
        path.join(
          cwd,
          `src/lib/shared/assets/images/credit_score/${score_ind_img}.png`,
        ),
        this.px2MM(lib_manag_main_box_x + 40),
        this.px2MM(lib_manag_main_box_y + 84.5),
        { width: this.px2MM(336), height: this.px2MM(239) },
      );

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(75))
        .text(
          `${credit_score}`,
          this.px2MM(lib_manag_main_box_x + 128),
          this.px2MM(lib_manag_main_box_y + 210.5),
          { width: this.px2MM(160), height: this.px2MM(70), align: 'center' },
        );

      let changeScr = '5';
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        //TODO: Change this to correct value
        .text(
          `Increase in score - `,
          this.px2MM(lib_manag_main_box_x + 40),
          this.px2MM(lib_manag_main_box_y + 353.5),
          {
            width: this.px2MM(300),
            height: this.px2MM(70),
            align: 'center',
            continued: true,
          },
        )
        .font('LeagueSpartan-SemiBold')
        .fillColor(this.hex2RGB('#26A670'))
        .fontSize(this.px2MM(40))
        .text(
          `${changeScr}`,
          this.px2MM(lib_manag_main_box_x + 67),
          this.px2MM(lib_manag_main_box_y + 350),
        );

      let Ind_x = lib_manag_main_box_x + 40 + 270;
      Ind_x += changeScr.length >= 3 ? 30 : changeScr.length >= 2 ? 15 : 4;
      let Ind_width = 35;
      let Ind_height = 38;
      //TODO: Change this condition from 0 to correct value
      const Ind_dir = 0 ? 'ArrowDown.png' : 'ArrowUp.png';
      pdf.image(
        path.join(
          cwd,
          'src',
          'lib',
          'shared',
          'assets',
          'images',
          'icons',
          Ind_dir,
        ),
        this.px2MM(Ind_x),
        this.px2MM(lib_manag_main_box_y + 352),
        { width: this.px2MM(Ind_width), height: this.px2MM(Ind_height) },
      );

      let subtext_x = lib_manag_main_box_x + 40;
      let subtext_y = lib_manag_main_box_y + 429;

      pdf
        .fillColor(this.hex2RGB('#F3F6F9'))
        .rect(
          this.px2MM(subtext_x),
          this.px2MM(subtext_y),
          this.px2MM(336),
          this.px2MM(80),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(14))
        .text(
          `${credit_score_comments}`,
          this.px2MM(subtext_x + 20),
          this.px2MM(subtext_y + 10),
          {
            width: this.px2MM(300),
            height: this.px2MM(70),
            align: 'left',
            lineGap: this.px2MM(6),
          },
        );

      let main_table_x = 591;
      let main_table_y = 270;
      let header_width = 192;
      let header_h = 200;

      ////Label
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .rect(
          this.px2MM(main_table_x - 6),
          this.px2MM(main_table_y - 42),
          this.px2MM(230),
          this.px2MM(42),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(
          'Affordability Check',
          this.px2MM(main_table_x),
          this.px2MM(main_table_y - 42 + 9),
          { width: this.px2MM(224), height: this.px2MM(42), align: 'center' },
        );

      // Header Liabilities Type

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .rect(
          this.px2MM(main_table_x - 6),
          this.px2MM(main_table_y),
          this.px2MM(6),
          this.px2MM(header_h),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Liability Type',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 12),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_x += header_width;
      header_width = 508.5;
      header_h = 100;

      // Header

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Current Liability Distribution',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_y += header_h;
      header_width = 254.25;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Outstanding',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_x += header_width;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'EMI',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_y = 270;
      main_table_x += header_width;
      header_width = 508.5;

      // Header  Suggested Range

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Suggested Range',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_y += header_h;
      header_width = 254.25;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'Loan Size',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      main_table_x += header_width;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(main_table_x),
          this.px2MM(main_table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .text(
          'EMI',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      ///////Body of the table

      let col_x = 591;
      let col_y = 470;
      let col_width = 192;
      let col_height = 100;

      for (let i = 0; i < liability_management_table.length; i++) {
        col_x = 591;
        col_width = 192;

        const bg_color = i % 2 == 0 ? '#F3F6F9' : '#FFFFFF';
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .rect(
            this.px2MM(col_x - 6),
            this.px2MM(col_y),
            this.px2MM(6),
            this.px2MM(col_height),
          )
          .fill();

        pdf
          .fillColor(this.hex2RGB(bg_color))
          .lineWidth(0.5)
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(col_x),
            this.px2MM(col_y),
            this.px2MM(col_width),
            this.px2MM(col_height),
          )
          .fillAndStroke();

        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `${liability_management_table[i]['liability_type']}`,
            this.px2MM(col_x + 20),
            this.px2MM(col_y + col_height / 2 - 12),
            {
              width: this.px2MM(col_width - 40),
              height: this.px2MM(32),
              align: 'left',
            },
          );

        col_x += col_width;
        col_width = 254.25;

        pdf
          .fillColor(this.hex2RGB(bg_color))
          .lineWidth(0.5)
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(col_x),
            this.px2MM(col_y),
            this.px2MM(col_width),
            this.px2MM(col_height),
          )
          .fillAndStroke();

        const current_liability_distribution_outstanding_percentage =
          this.format_cash2(
            parseFloat(
              liability_management_table[i][
              'current_liability_distribution_outstanding_percentage'
              ],
            ),
          );
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `₹${current_liability_distribution_outstanding_percentage}`,
            this.px2MM(col_x + 20),
            this.px2MM(col_y + col_height / 2 - 12),
            {
              width: this.px2MM(col_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        col_x += col_width;

        pdf
          .fillColor(this.hex2RGB(bg_color))
          .lineWidth(0.5)
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(col_x),
            this.px2MM(col_y),
            this.px2MM(col_width),
            this.px2MM(col_height),
          )
          .fillAndStroke();

        const current_liability_distribution_emi_percentage = this.format_cash2(
          parseFloat(
            liability_management_table[i][
            'current_liability_distribution_emi_percentage'
            ],
          ),
        );
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `₹${current_liability_distribution_emi_percentage}`,
            this.px2MM(col_x + 20),
            this.px2MM(col_y + col_height / 2 - 12),
            {
              width: this.px2MM(col_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        col_x += col_width;

        pdf
          .fillColor(this.hex2RGB(bg_color))
          .lineWidth(0.5)
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(col_x),
            this.px2MM(col_y),
            this.px2MM(col_width),
            this.px2MM(col_height),
          )
          .fillAndStroke();

        const suggested_loan_size_range = liability_management_table?.[i]?.[
          'suggested_loan_size_range'
        ]
          .split('to')
          .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
          .join(' to ');
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `${suggested_loan_size_range}`,
            this.px2MM(col_x + 20),
            this.px2MM(col_y + col_height / 2 - 12),
            {
              width: this.px2MM(col_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        col_x += col_width;

        pdf
          .fillColor(this.hex2RGB(bg_color))
          .lineWidth(0.5)
          .strokeColor(this.hex2RGB('#E9EAEE'))
          .rect(
            this.px2MM(col_x),
            this.px2MM(col_y),
            this.px2MM(col_width),
            this.px2MM(col_height),
          )
          .fillAndStroke();

        const suggested_emi_range = liability_management_table?.[i]?.[
          'suggested_emi_range'
        ]
          .split('to')
          .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
          .join(' to ');
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `${suggested_emi_range}`,

            this.px2MM(col_x + 20),
            this.px2MM(col_y + col_height / 2 - 12),
            {
              width: this.px2MM(col_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        col_y += col_height;
      }

      //////////////Total

      col_x = 591;
      col_width = 192;

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .rect(
          this.px2MM(col_x - 6),
          this.px2MM(col_y),
          this.px2MM(6),
          this.px2MM(col_height),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .lineWidth(0.5)
        .strokeColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(col_x),
          this.px2MM(col_y),
          this.px2MM(1209),
          this.px2MM(col_height),
        )
        .fillAndStroke();

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `${liability_management_total['liability_type']}`,
          this.px2MM(col_x + 20),
          this.px2MM(col_y + col_height / 2 - 12),
          {
            width: this.px2MM(col_width - 40),
            height: this.px2MM(32),
            align: 'left',
          },
        );

      col_x += col_width;
      col_width = 254.25;

      const current_liability_distribution_outstanding_total =
        this.format_cash2(
          parseFloat(
            liability_management_total[
            'current_liability_distribution_outstanding_percentage'
            ],
          ),
        );
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `₹${current_liability_distribution_outstanding_total}`,
          this.px2MM(col_x + 20),
          this.px2MM(col_y + col_height / 2 - 12),
          {
            width: this.px2MM(col_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      col_x += col_width;

      const current_liability_distribution_emi_percentage = this.format_cash2(
        parseFloat(
          liability_management_total[
          'current_liability_distribution_emi_percentage'
          ],
        ),
      );
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `₹${current_liability_distribution_emi_percentage}`,
          this.px2MM(col_x + 20),
          this.px2MM(col_y + col_height / 2 - 12),
          {
            width: this.px2MM(col_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      col_x += col_width;

      const suggested_loan_size_range = liability_management_total?.[
        'suggested_loan_size_range'
      ]
        .split('to')
        .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
        .join(' to ');
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `${suggested_loan_size_range}`,
          this.px2MM(col_x + 20),
          this.px2MM(col_y + col_height / 2 - 12),
          {
            width: this.px2MM(col_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      col_x += col_width;

      const suggested_emi_range = liability_management_total?.[
        'suggested_emi_range'
      ]
        .split('to')
        .map((item) => `₹${this.format_cash2(parseFloat(item.trim()))}`)
        .join(' to ');
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `${suggested_emi_range}`,
          this.px2MM(col_x + 20),
          this.px2MM(col_y + col_height / 2 - 12),
          {
            width: this.px2MM(col_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      //////Comments

      let text_x = 120;

      let text_y = 810;
      let text_width = 1680;
      let text_height = 42;

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(32))
        .text('Comments', this.px2MM(text_x), this.px2MM(text_y), {
          width: this.px2MM(text_width),
          height: this.px2MM(text_height),
          align: 'left',
        });

      text_y += text_height + 20;

      pdf.y = this.px2MM(text_y);

      for (let i = 0; i < liability_management_comments.length; i++) {
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .rect(
            this.px2MM(text_x),
            this.px2MM(text_y + 7),
            this.px2MM(10),
            this.px2MM(10),
          )
          .fill();

        pdf
          .fillColor(this.hex2RGB('#1A1A1D'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `${liability_management_comments[i]}`,
            this.px2MM(text_x + 30),
            pdf.y,
            {
              width: this.px2MM(text_width),
              lineGap: this.px2MM(10),
              align: 'left',
            },
          );

        pdf.y += this.px2MM(20);
        text_y = this.mm2PX(pdf.y);
      }

      // index Text
      this.index_text(pdf, '#1A1A1D');
    } catch (err) {
      Logger.error(err);
    }
  }


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

      let main_table_x = 120;
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
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(30))
        .text(
          'After Planning',
          this.px2MM(main_table_x + 20),
          this.px2MM(main_table_y + header_h / 2 - 24),
          {
            width: this.px2MM(header_width - 40),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      // Table Body

      main_table_x = 120;
      main_table_y += header_h;
      header_width = 403;
      header_h = 112.5;

      const rows = [
        'Tax Regime',
        'Deductions',
        'Taxable Income',
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
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        if (tax_liability_comparison_current_table?.[i]?.opted) {
          const opted_h = 36;
          pdf
            .fillColor(this.hex2RGB('#E9EAEE'))
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
              'OPTED',
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
          .fillColor(this.hex2RGB('#FFFFFF'))
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

        //Taxable Income
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
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
          .fillColor(this.hex2RGB('#FFFFFF'))
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

      /// After Planning Tax Regime
      for (
        let i = 0;
        i < tax_liability_comparison_after_planning_table?.length;
        i++
      ) {
        let bgcolor = tax_liability_comparison_after_planning_table?.[i]
          ?.recommended
          ? '#DEF7F1'
          : '#FFFFFF';
        //Regime Name
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        let color = tax_liability_comparison_after_planning_table?.[i]
          ?.recommended
          ? '#229479'
          : '#1A1A1D';

        if (tax_liability_comparison_after_planning_table?.[i]?.recommended) {
          const recommendation_h = 36;
          pdf
            .fillColor(this.hex2RGB('#ACE4D7'))
            .rect(
              this.px2MM(main_table_x),
              this.px2MM(main_table_y),
              this.px2MM(header_width),
              this.px2MM(recommendation_h),
            )
            .fill();

          pdf
            .fillColor(this.hex2RGB('#4B4C51'))
            .font('LeagueSpartan-Medium')
            .fontSize(this.px2MM(18))
            .text(
              'RECOMMENDED',
              this.px2MM(main_table_x + 20),
              this.px2MM(main_table_y + recommendation_h / 2 - 9),
              {
                width: this.px2MM(header_width - 40),
                height: this.px2MM(32),
                characterSpacing: this.px2MM(2),
                align: 'center',
              },
            );
        }

        pdf
          .fillColor(this.hex2RGB(color))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(30))
          .text(
            `${tax_liability_comparison_after_planning_table?.[i]?.tax_regime
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

        const deduction = tax_liability_comparison_after_planning_table?.[i]
          ?.deductions
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_after_planning_table?.[i]?.deductions,
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

        const taxable_income = tax_liability_comparison_after_planning_table?.[
          i
        ]?.taxable_income
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_after_planning_table?.[i]
                ?.taxable_income,
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

        const total_tax_payable =
          tax_liability_comparison_after_planning_table?.[i]?.total_tax_payable
            ? `₹ ${this.format_amt_number(
              parseFloat(
                tax_liability_comparison_after_planning_table?.[i]
                  ?.total_tax_payable,
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

      const footer_height = 164;
      const footer_y = 816;
      const footer_x = 370;
      const footer_width = 1200;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .rect(
          this.px2MM(footer_x),
          this.px2MM(footer_y),
          this.px2MM(footer_width),
          this.px2MM(footer_height),
        )
        .fill();

      let subtitle_x = footer_x + 40;
      let subtitle_y = footer_y + 40;
      let subtitle_width = 250;
      let subtitle_height = 32;

      pdf
        .fillColor(this.hex2RGB('#898B90'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          'Current Payable Tax',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y),
          {
            width: this.px2MM(subtitle_width),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      subtitle_y += subtitle_height;
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(35))
        //TODO: Change the value
        .text(
          '₹ 12,22,4434',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y + 16),
          { width: this.px2MM(250), height: this.px2MM(32), align: 'center' },
        );
      subtitle_x += subtitle_width + 40;
      pdf.image(
        path.join(cwd, 'src/lib/shared/assets/images/icons/minus.png'),
        this.px2MM(subtitle_x),
        this.px2MM(subtitle_y + 5),
        { width: this.px2MM(40), height: this.px2MM(40) },
      );

      subtitle_y = footer_y + 40;
      subtitle_x += 80;
      subtitle_width = 280;

      pdf
        .fillColor(this.hex2RGB('#898B90'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          'Recommended Payable Tax',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y),
          {
            width: this.px2MM(subtitle_width),
            height: this.px2MM(32),
            align: 'center',
          },
        );
      subtitle_y += subtitle_height;

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(35))
        //TODO: Change the value
        .text(
          '₹ 10,89,444',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y + 16),
          {
            width: this.px2MM(subtitle_width),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      subtitle_x += subtitle_width + 40;
      pdf.image(
        path.join(cwd, 'src/lib/shared/assets/images/icons/equal.png'),
        this.px2MM(subtitle_x),
        this.px2MM(subtitle_y + 5),
        { width: this.px2MM(40), height: this.px2MM(40) },
      );

      subtitle_y = footer_y + 37;
      subtitle_x += 80;
      subtitle_width = 400;

      pdf
        .fillColor(this.hex2RGB('#65676D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .text(
          'Potential Tax ',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y),
          {
            width: this.px2MM(subtitle_width),
            height: this.px2MM(32),
            align: 'left',
            continued: true,
          },
        );
      pdf
        .fontSize(this.px2MM(40))
        .font('LeagueSpartan-SemiBold')
        .fillColor(this.hex2RGB('#229479'))
        .text('Savings', { continued: false });

      subtitle_y += subtitle_height;
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(56))
        //TODO: Change the value
        .text(
          '₹ 1,32,990',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y + 16),
          {
            width: this.px2MM(subtitle_width),
            height: this.px2MM(32),
            align: 'center',
          },
        );
    } catch (error) {
      Logger.error(error);
    }
  }

  async tax_deduction_exemption_template(pdf: PDFKit.PDFDocument) {
    try {
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
        .text('Tax Deduction & Exemption', this.px2MM(120), this.px2MM(92), {
          width: this.px2MM(807),
          height: this.px2MM(84),
          align: 'left',
        });
      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#1A1A1D'))
        .text(`Old Regime`, this.px2MM(1380), this.px2MM(114), {
          width: this.px2MM(420),
          height: this.px2MM(32),
          align: 'right',
        });

      let table_x = 120;
      let table_y = 200;

      let header_width = 1319;
      let header_h = 121;

      const rows = [
        'Deductions & Exemptions',
        'Max. Deduction',
        'Current Utilisation',
        'Suggested Utilisation',
      ];
      const rows_width = [623, 178, 205, 235];

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .rect(
          this.px2MM(table_x),
          this.px2MM(table_y),
          this.px2MM(header_width),
          this.px2MM(header_h),
        )
        .fill();

      table_x += 40;

      for (let i = 0; i < rows?.length; i++) {
        pdf
          .fillColor(this.hex2RGB('#898B90'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(24))
          .text(
            `${rows[i]}`,
            this.px2MM(table_x),
            this.px2MM(table_y + header_h / 2 - 12),
            {
              width: this.px2MM(rows_width[i]),
              height: this.px2MM(32),
              align: i == 0 ? 'left' : 'right',
            },
          );
        table_x += rows_width[i];
      }

      const chart_box_x = 1479;
      const chart_box_y = 204;
      const chart_box_width = 321;
      const chart_box_height = 725;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .rect(
          this.px2MM(chart_box_x),
          this.px2MM(chart_box_y),
          this.px2MM(chart_box_width),
          this.px2MM(chart_box_height),
        )
        .fill();

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(
          `Utilisation of Deductions/Exemptions`,
          this.px2MM(chart_box_x + 40),
          this.px2MM(chart_box_y + 40),
          {
            width: this.px2MM(chart_box_width - 80),
            lineGap: this.px2MM(7),
            align: 'center',
          },
        );

      let chart_main_box_x = chart_box_x + 80.5;
      let chart_main_box_y = chart_box_y + 120;

      let chart_block_max_height = 476;
      let chart_block_width = 80;

      //TODO: Change the value
      let temp_current_val = parseInt('15002000');
      let temp_recommend_val = parseInt('20002000');
      let big_block_val =
        temp_current_val > temp_recommend_val
          ? temp_current_val
          : temp_recommend_val;

      let current_block_height =
        (temp_current_val / big_block_val) * chart_block_max_height;
      let current_block_y_shift = chart_block_max_height - current_block_height;

      const format_current_val = `₹ ${this.format_cash2(temp_current_val)}`;
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `${format_current_val}`,
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y + current_block_y_shift),
          {
            width: this.px2MM(chart_block_width),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      pdf
        .fillColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y + current_block_y_shift + 45),
          this.px2MM(chart_block_width),
          this.px2MM(current_block_height),
        )
        .fill();

      chart_main_box_x += chart_block_width;
      let recommend_block_height =
        (temp_recommend_val / big_block_val) * chart_block_max_height;
      let recommend_block_y_shift =
        chart_block_max_height - recommend_block_height;

      const format_recommend_val = `₹ ${this.format_cash2(temp_recommend_val)}`;
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          `${format_recommend_val}`,
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y + recommend_block_y_shift),
          {
            width: this.px2MM(chart_block_width),
            height: this.px2MM(32),
            align: 'center',
          },
        );

      pdf
        .fillColor(this.hex2RGB('#90BEF8'))
        .rect(
          this.px2MM(chart_main_box_x),
          this.px2MM(chart_main_box_y + recommend_block_y_shift + 45),
          this.px2MM(chart_block_width),
          this.px2MM(recommend_block_height),
        )
        .fill();

      //legend

      let legend_x = chart_box_x + 40;
      let legend_y = chart_box_y + 666.5;
      let legend_width = 12;
      let legend_height = 12;

      pdf
        .fillColor(this.hex2RGB('#E9EAEE'))
        .rect(
          this.px2MM(legend_x),
          this.px2MM(legend_y),
          this.px2MM(legend_height),
          this.px2MM(legend_height),
        )
        .fill();

      legend_x += legend_width + 8;
      legend_y -= 3;
      legend_width = 65;
      legend_height = 25;
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(18))
        .text(`Current`, this.px2MM(legend_x), this.px2MM(legend_y), {
          width: this.px2MM(legend_width),
          height: this.px2MM(legend_height),
          align: 'left',
        });

      legend_x += legend_width + 30;
      legend_width = 12;
      legend_height = 12;
      pdf
        .fillColor(this.hex2RGB('#90BEF8'))
        .rect(
          this.px2MM(legend_x),
          this.px2MM(legend_y),
          this.px2MM(legend_height),
          this.px2MM(legend_height),
        )
        .fill();

      legend_x += legend_width + 8;
      legend_y -= 3;
      legend_width = 120;
      legend_height = 25;
      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(18))
        .text(`Recommended`, this.px2MM(legend_x), this.px2MM(legend_y), {
          width: this.px2MM(legend_width),
          height: this.px2MM(legend_height),
          align: 'left',
        });

      legend_x += legend_width + 40;

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(18))
        .text(
          `* Includes only the increase in investment`,
          this.px2MM(120),
          this.px2MM(1035),
          { width: this.px2MM(1680), height: this.px2MM(25), align: 'left' },
        );
    } catch (err) {
      Logger.error(err);
    }
  }

  async tax_deduction_exemption(pdf: PDFKit.PDFDocument, jsondata: any) {
    try {
      const tax_planning = jsondata?.tax_planning;
      if (!tax_planning) return;

      const tax_deduction_exemption_table =
        tax_planning?.tax_deduction_exemption_table;

      /// table Body

      let table_x = 120;
      let table_y = 288;
      const header_width = 1319;
      const header_h = 112.5;

      for (let i = 0; i < tax_deduction_exemption_table?.length; i++) {
        if (i === 0 || table_y > 745) {
          await this.tax_deduction_exemption_template(pdf);
          table_y = 288;
        }

        const cols = [
          'tax_class',
          'max_deduction',
          'current_utilisation',
          'suggested_utilisation',
        ];
        const cols_width = [623, 178, 205, 235];

        // row Block
        pdf
          .fillColor(this.hex2RGB('#FFFFFF'))
          .rect(
            this.px2MM(table_x),
            this.px2MM(table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();
        table_x += 40;

        // Table Body
        for (let j = 0; j < cols?.length; j++) {
          let direction = j === 0 ? 'left' : 'right';
          let col_val = parseFloat(
            tax_deduction_exemption_table?.[i]?.[cols[j]],
          )
            ? `₹ ${this.format_amt_number(
              parseFloat(tax_deduction_exemption_table?.[i]?.[cols[j]]),
            )}`
            : tax_deduction_exemption_table?.[i]?.[cols[j]];
          pdf
            .fillColor(this.hex2RGB('#1A1A1D'))
            .font('LeagueSpartan-SemiBold')
            .fontSize(this.px2MM(20))
            .text(
              `${col_val}`,
              this.px2MM(table_x),
              this.px2MM(table_y + header_h / 2 - 28),
              {
                width: this.px2MM(cols_width[j]),
                height: this.px2MM(32),
                align: direction,
              },
            );
          table_x += cols_width[j];
        }

        table_x = 120;

        pdf
          .fillColor(this.hex2RGB('#898B90'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(18))
          .text(
            `${tax_deduction_exemption_table?.[i]?.tax_class_sub_val}`,
            this.px2MM(table_x + 40),
            this.px2MM(table_y + header_h / 2 + 12),
            {
              width: this.px2MM(cols_width[0]),
              height: this.px2MM(25),
              align: 'left',
            },
          );
        table_x += cols_width[0] + 430;
        pdf
          .fillColor(this.hex2RGB('#649DE5'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(18))
          //TODO: Change the value
          .text(
            `Additional ₹ 10,000*`,
            this.px2MM(table_x),
            this.px2MM(table_y + header_h / 2 + 12),
            {
              width: this.px2MM(cols_width[3]),
              height: this.px2MM(25),
              align: 'right',
            },
          );

        table_y += header_h;
        table_x = 120;

        if (i === tax_deduction_exemption_table?.length - 1) {
          //table Footer  Line
          pdf
            .fillColor(this.hex2RGB('#1A1A1D'))
            .rect(
              this.px2MM(table_x + 40),
              this.px2MM(table_y),
              this.px2MM(1239),
              this.px2MM(1),
            )
            .fill();

          /// Table Footer  Block
          pdf
            .fillColor(this.hex2RGB('#FFFFFF'))
            .rect(
              this.px2MM(table_x),
              this.px2MM(table_y),
              this.px2MM(header_width),
              this.px2MM(header_h + 56),
            )
            .fill();

          let total_current_x = table_x + cols_width[0] + cols_width[1] + 40;
          pdf
            .fillColor(this.hex2RGB('#1A1A1D'))
            .font('LeagueSpartan-SemiBold')
            .fontSize(this.px2MM(24))
            //TODO: Change the value
            .text(
              `₹ 7,00,000`,
              this.px2MM(total_current_x),
              this.px2MM(table_y + header_h / 2 - 28),
              {
                width: this.px2MM(cols_width[2]),
                height: this.px2MM(32),
                align: 'right',
              },
            );

          let total_suggest_x =
            table_x + cols_width[0] + cols_width[1] + cols_width[2] + 40;
          pdf
            .fillColor(this.hex2RGB('#649DE5'))
            .font('LeagueSpartan-SemiBold')
            .fontSize(this.px2MM(24))
            //TODO: Change the value
            .text(
              `₹ 7,00,000`,
              this.px2MM(total_suggest_x),
              this.px2MM(table_y + header_h / 2 - 28),
              {
                width: this.px2MM(cols_width[3]),
                height: this.px2MM(32),
                align: 'right',
              },
            );
          table_y += header_h - 24;
          table_x = 120;
          pdf
            .fillColor(this.hex2RGB('#898B90'))
            .font('LeagueSpartan-Light')
            .fontSize(this.px2MM(18))
            .text(
              `You can save `,
              this.px2MM(table_x + 273),
              this.px2MM(table_y),
              {
                width: this.px2MM(1000),
                align: 'left',
                continued: true,
              },
            )
            .fillColor(this.hex2RGB('#229479'))
            .font('LeagueSpartan-SemiBold')
            .fontSize(this.px2MM(24))
            .text(
              ` ₹ 10,000`, //TODO: Change the value
              { continued: true },
            )
            .fillColor(this.hex2RGB('#898B90'))
            .font('LeagueSpartan-Light')
            .fontSize(this.px2MM(18))
            .text(`  in taxes with an additional investment/insurance of  `, {
              continued: true,
            })
            .fillColor(this.hex2RGB('#229479'))
            .font('LeagueSpartan-SemiBold')
            .fontSize(this.px2MM(24))
            .text(
              ` ₹ 10,000`, //TODO: Change the value
              { continued: false },
            );
        }
      }
    } catch (err) {
      Logger.error(err);
    }
  }

  async tax_liability_potential_saving_page2(
    pdf: PDFKit.PDFDocument,
    jsondata: any,
  ) {
    try {
      const tax_planning = jsondata?.tax_planning;
      if (!tax_planning) return;

      const tax_liability_comparison_table =
        tax_planning?.tax_liability_potential_saving
          ?.tax_liability_comparison_table?.after_planning;
      const action_of_this_year = tax_planning?.action_of_this_year;

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

      let main_table_x = 120;
      let main_table_y = 240;
      let header_width = 311;
      let header_h = 121;

      const rows = [
        'Tax Camparison',
        'Deductions',
        'Taxable Income',
        'Total Tax Payable',
      ];

      for (let i = 0; i < rows.length; i++) {
        let bgcolor = i == 0 ? '#F3F6F9' : '#FFFFFF';
        let color = i == 0 ? '#000000' : '#898B90';
        header_h = i == 0 ? 121 : 150;
        let font = i == 0 ? 'LeagueSpartan-Medium' : 'LeagueSpartan-Regular';
        pdf
          .fillColor(this.hex2RGB(bgcolor))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        pdf
          .fillColor(this.hex2RGB(color))
          .font(font)
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

      main_table_x += header_width;
      main_table_y = 240;
      header_width = 322.5;

      for (let i = 0; i < tax_liability_comparison_table.length; i++) {
        let header_h = 121;

        let bgcolor = tax_liability_comparison_table?.[i]?.recommended
          ? '#DEF7F1'
          : '#FFFFFF';
        //Regime Name
        pdf
          .fillColor(this.hex2RGB('#F3F6F9'))
          .rect(
            this.px2MM(main_table_x),
            this.px2MM(main_table_y),
            this.px2MM(header_width),
            this.px2MM(header_h),
          )
          .fill();

        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Medium')
          .fontSize(this.px2MM(30))
          .text(
            `${tax_liability_comparison_table?.[i]?.tax_regime}`,
            this.px2MM(main_table_x + 20),
            this.px2MM(main_table_y + header_h / 2 - 20),
            {
              width: this.px2MM(header_width - 40),
              height: this.px2MM(32),
              align: 'center',
            },
          );

        main_table_y += header_h;
        header_h = 150;
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

        if (tax_liability_comparison_table?.[i]?.recommended) {
          const recommendation_h = 36;
          pdf
            .fillColor(this.hex2RGB('#ACE4D7'))
            .rect(
              this.px2MM(main_table_x),
              this.px2MM(main_table_y),
              this.px2MM(header_width),
              this.px2MM(recommendation_h),
            )
            .fill();

          pdf
            .fillColor(this.hex2RGB('#000000'))
            .font('LeagueSpartan-Medium')
            .fontSize(this.px2MM(18))
            .text(
              'RECOMMENDED',
              this.px2MM(main_table_x + 20),
              this.px2MM(main_table_y + recommendation_h / 2 - 9),
              {
                width: this.px2MM(header_width - 40),
                height: this.px2MM(32),
                characterSpacing: this.px2MM(2),
                align: 'center',
              },
            );
        }

        const deduction = tax_liability_comparison_table?.[i]
          ?.standard_deduction
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_table?.[i]?.standard_deduction,
            ),
          )}`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#000000'))
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

        const taxable_income = tax_liability_comparison_table?.[i]
          ?.taxable_income
          ? `₹ ${this.format_amt_number(
            parseFloat(tax_liability_comparison_table?.[i]?.taxable_income),
          )}`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#000000'))
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

        const total_tax_payable = tax_liability_comparison_table?.[i]
          ?.total_tax_payable
          ? `₹ ${this.format_amt_number(
            parseFloat(
              tax_liability_comparison_table?.[i]?.total_tax_payable,
            ),
          )}`
          : '-';
        pdf
          .fillColor(this.hex2RGB('#000000'))
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
        main_table_y = 240;
      }

      let text_x = 1136;
      let text_y = 240;
      let text_width = 664;

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(32))
        .text(`Action fo this year`, this.px2MM(text_x), this.px2MM(text_y), {
          width: this.px2MM(text_width),
          height: this.px2MM(42),
          align: 'left',
        });

      text_y += 62;

      pdf.y = this.px2MM(text_y);
      for (let i = 0; i < action_of_this_year.length; i++) {
        pdf
          .fillColor(this.hex2RGB('#000000'))
          .font('LeagueSpartan-Regular')
          .fontSize(this.px2MM(30))
          .text(`${action_of_this_year[i]}`, this.px2MM(text_x), pdf.y, {
            width: this.px2MM(text_width),
            align: 'left',
            lineGap: this.px2MM(6),
          });
        pdf.y += this.px2MM(24);
      }

      const footer_height = 80;
      const footer_y = 900;
      const footer_x = 140;
      const footer_width = 1640;

      pdf
        .fillColor(this.hex2RGB('#FFFFFF'))
        .rect(
          this.px2MM(footer_x),
          this.px2MM(footer_y),
          this.px2MM(footer_width),
          this.px2MM(footer_height),
        )
        .fill();

      let subtitle_x = footer_x + 40;
      let subtitle_y = footer_y + 24;
      let subtitle_width = 1560;
      let subtitle_height = 32;

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(24))
        .text(
          'You may share the exemptions & deduction details with your Advisor. This will help us plan your tax strategy and maximize your savings.',
          this.px2MM(subtitle_x),
          this.px2MM(subtitle_y),
          {
            width: this.px2MM(subtitle_width),
            height: this.px2MM(subtitle_height),
            align: 'center',
          },
        );
    } catch (error) {
      Logger.error(error);
    }
  }


  disclaimer(pdf: PDFKit.PDFDocument) {
    try {
      const disclaimers = [
        'This report is based on the data and presumptions supplied by you (client/ user/ member).',
        'This report is designed to assess your present financial condition and recommend planning ideas and concepts that may be beneficial. This report aims to demonstrate how well-established financial planning principles can enhance your existing financial situation. This report does not imply a recommendation of any specific method, but rather offers broad, general advice on the benefits of a few financial planning principles.',
        'The reports give estimates based on multiple hypotheses; thus they are purely speculative and do not represent assurances of investment returns. Before making any financial decisions or adopting any transactions or plans, you should speak with your tax and/or legal counsel and solely decide on the execution and implementation.',
        '1 Finance Private Limited or any of its representatives will not be liable or responsible for any losses or damages incurred by the client/user/member as a result of this report.',
        'Prices mentioned in this report may have come from sources we believe to be dependable, but they are not guaranteed. It’s crucial to understand that past performance does not guarantee future outcomes and that actual results may vary from the forecasts in this report.',
        'Unless changes to your financial or personal situation necessitate a more frequent review, we advise that you evaluate your plan once a quarter. Please be aware that some discrepancies could occur due to different calculation methods.',
      ];

      pdf.addPage();
      pdf.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      pdf.scale(this.scale_pdf() || 1.6572658674215652);
      pdf
        .fillColor(this.hex2RGB('#FCF8ED'))
        .rect(0, 0, this.px2MM(1920), this.px2MM(1080))
        .fill();

      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(60))
        .fillColor(this.hex2RGB('#1A1A1D'))
        .text('Disclaimer', this.px2MM(140), this.px2MM(78));

      pdf
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(36))
        .fillColor(this.hex2RGB('#1A1A1D'))
        .text(
          'The Disclaimer page should be read in conjunction with this report.',
          this.px2MM(140),
          this.px2MM(202),
        );

      pdf.moveTo(this.px2MM(140), this.px2MM(128));
      pdf.y = this.px2MM(263);
      for (let i = 0; i < disclaimers.length; i++) {
        pdf
          .font('LeagueSpartan-Light')
          .fontSize(this.px2MM(24))
          .fillColor(this.hex2RGB('#000000'))
          .text(disclaimers[i], this.px2MM(140), pdf.y + this.px2MM(24), {
            width: this.px2MM(1640),
            lineGap: this.px2MM(6),
            align: 'left',
          });
      }

      const url_y = pdf.y;

      pdf
        .fillColor(this.hex2RGB('#000000'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .text(
          'Investment in securities market are subject to market risks. Read all the related documents carefully before investing.' +
          '\nRegistration granted by SEBI, membership of BASL and certification from National Institute of Securities Markets (NISM) in no way guarantee performance of the intermediary or provide any assurance of returns to investors.',
          this.px2MM(140),
          url_y + this.px2MM(50),
          { width: this.px2MM(1640), lineGap: this.px2MM(4), align: 'left' },
        );

      let register_y = pdf.y + this.px2MM(50);

      //TODO: Change the registration number
      const registration_num = 'INA000017523';
      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        //TODO: Change the registration number
        .text(
          `SEBI RIA Registration No : ${registration_num}`,
          this.px2MM(140),
          register_y,
          { width: this.px2MM(850), lineGap: this.px2MM(4), align: 'left' },
        );

      //TODO: Change the registration Date
      const register_date = 'December 22, 2022-Perpetual';
      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        //TODO: Change the registration Date
        .text(
          `Validity of Registration : ${register_date}`,
          this.px2MM(900),
          register_y,
          { width: this.px2MM(860), lineGap: this.px2MM(4), align: 'right' },
        );

      register_y = pdf.y + this.px2MM(10);

      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        //TODO: Change the registration number
        .text(`BASL Registration No : `, this.px2MM(140), register_y, {
          width: this.px2MM(850),
          lineGap: this.px2MM(4),
          align: 'left',
        });

      const type_registration = 'Non-Individual';
      pdf
        .fillColor(this.hex2RGB('#1A1A1D'))
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        //TODO: Change the registration Date
        .text(
          `Type of Registration : ${type_registration}`,
          this.px2MM(900),
          register_y,
          { width: this.px2MM(860), lineGap: this.px2MM(4), align: 'right' },
        );
    } catch (err) {
      Logger.error(err);
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
        .text('1 Finance Private Limited', this.px2MM(700), this.px2MM(308), {
          width: this.px2MM(520),
          align: 'center',
        });

      pdf
        .font('LeagueSpartan-Medium')
        .fontSize(this.px2MM(32))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text('Office Address', this.px2MM(861.5), this.px2MM(415), {
          width: this.px2MM(197),
          height: this.px2MM(44),
          border: 0,
          align: 'center',
        });

      pdf
        .font('LeagueSpartan-Light')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(
          'Unit No. 1101 & 1102, 11th Floor, B - Wing, \nLotus Corporate Park, Goregaon (E), Mumbai-400063,',
          this.px2MM(518),
          this.px2MM(460),
          {
            width: this.px2MM(876),
            lineGap: this.px2MM(8),
            border: 0,
            align: 'center',
          },
        );

      pdf.image(
        path.join(cwd, 'src/lib/shared/assets/images/icons/gmail.png'),
        this.px2MM(676.5),
        this.px2MM(602),
        { width: this.px2MM(32), height: this.px2MM(32) },
      );
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(25.33))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text('care@1finance.co.in', this.px2MM(724.5), this.px2MM(602), {
          border: 0,
          align: 'left',
        });

      pdf.image(
        path.join(cwd, 'src/lib/shared/assets/images/icons/globe.png'),
        this.px2MM(966.5),
        this.px2MM(602),
        { width: this.px2MM(32), height: this.px2MM(32) },
      );
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text('https://1finance.co.in', this.px2MM(1014.5), this.px2MM(602), {
          border: 0,
          align: 'left',
        });
      pdf
        .font('LeagueSpartan-SemiBold')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(
          'Corresponding SEBI Local Office Address',
          this.px2MM(230),
          this.px2MM(674),
          {
            width: this.px2MM(1387),
            align: 'center',
            continued: true,
            lineGap: this.px2MM(8),
          },
        )
        .font('LeagueSpartan-Medium')
        .text(
          '\nSecurities and Exchange Board of India, Mumbai Regional Office, Mittal Court, A Wing, Gr. Floor, 224, Nariman Point, Mumbai - 400021',
          {
            width: this.px2MM(1387),
            align: 'center',
          },
        );

      pdf.image(
        path.join(cwd, 'src/lib/shared/assets/images/icons/Line 3.png'),
        this.px2MM(110),
        this.px2MM(791),
        { width: this.px2MM(1700), height: this.px2MM(0.02) },
      );

      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(
          'CEO \nMr. Nitin Gupta\nEmail id : nitin@1finance.co.in\nContact No : +91 22 69120000',
          this.px2MM(108),
          this.px2MM(852),
          {
            width: this.px2MM(305),
            align: 'center',
            lineGap: this.px2MM(8),
          },
        );

      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(
          'Chef Technology Officer\nMr. Nikhil Bhosele \nEmail id :nikhil.bhosele@1finance.co.in\nContact No : +91 22 69121150',
          this.px2MM(750),
          this.px2MM(852),
          {
            width: this.px2MM(420),
            align: 'center',
            lineGap: this.px2MM(8),
          },
        );

      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(24))
        .fillColor(this.hex2RGB('#FFFFFF'))
        .text(
          'Intern Developer \nRuthvik Salunkhe\n1 FINANCE PRIVATE LIMITED \nDate : Mon Apr 01 11:27:59 IST 2024',
          this.px2MM(1459),
          this.px2MM(852),
          {
            width: this.px2MM(354),
            align: 'center',
            lineGap: this.px2MM(8),
          },
        );

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
      const user_name = jsondata?.meta?.name || '';

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
        .text('Financial Analysis', this.px2MM(120), this.px2MM(422));

      // Test of User name and Date
      let name_y = 680;

      pdf
        .font('LeagueSpartan-Regular')
        .fontSize(this.px2MM(40))
        .fillColor(this.hex2RGB('#FFFFFF'))
        //TODO: Change the text to dynamic
        .text(
          '2nd Consultation Report',
          this.px2MM(120),
          this.px2MM(name_y + 16),
          {
            width: this.px2MM(1020),
            lineGap: 4,
            align: 'left',
          },
        );

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


      await this.netWorth(pdf, jsondata);

      await this.liability_management(pdf, jsondata);

      await this.tax_liability_potential_saving(pdf, jsondata);

      await this.tax_deduction_exemption(pdf, jsondata);


      await this.tax_liability_potential_saving_page2(pdf, jsondata);


      await this.disclaimer(pdf);

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
