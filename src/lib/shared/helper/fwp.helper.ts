import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { PDFKit } from 'pdfkit';

@Injectable()
export class FWPHelper {
  cwd = process.cwd();
  constructor() {}

  registerFonts(pdf: PDFKit.PDFDocument) {
    pdf.registerFont(
      'LeagueSpartan-SemiBold',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'League_Spartan',
        'static',
        'LeagueSpartan-SemiBold.ttf',
      ),
    );
    pdf.registerFont(
      'LeagueSpartan-Bold',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'League_Spartan',
        'static',
        'LeagueSpartan-Bold.ttf',
      ),
    );
    pdf.registerFont(
      'LeagueSpartan-Regular',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'League_Spartan',
        'static',
        'LeagueSpartan-Regular.ttf',
      ),
    );
    pdf.registerFont(
      'LeagueSpartan-Medium',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'League_Spartan',
        'static',
        'LeagueSpartan-Medium.ttf',
      ),
    );
    pdf.registerFont(
      'LeagueSpartan-Light',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'League_Spartan',
        'static',
        'LeagueSpartan-Light.ttf',
      ),
    );
    pdf.registerFont(
      'Prata',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'Prata',
        'Prata-Regular.ttf',
      ),
    );
    pdf.registerFont(
      'Inter-Light',
      path.join(
        this.cwd,
        'src',
        'lib',
        'shared',
        'assets',
        'fonts',
        'Inter',
        'static',
        'Inter-Light.ttf',
      ),
    );
    pdf.registerFont(
      'Spirit-Soft-Light',
      path.join(
        this.cwd,
        'src/lib/shared/assets/fonts/Spirits-Soft/Spirits Neutral Light.otf',
      ),
    );

    pdf.registerFont(
      'Spirit-Soft-Regular',
      path.join(
        this.cwd,
        'src/lib/shared/assets/fonts/Spirits-Soft/Spirits Neutral Regular.otf',
      ),
    );

    pdf.registerFont(
      'Fira-Sans-Regular',
      path.join(
        this.cwd,
        'src/lib/shared/assets/fonts/Fira-Sans/FiraSans-Regular.ttf',
      ),
    );

    pdf.registerFont(
      'Fira-Sans-Bold',
      path.join(
        this.cwd,
        'src/lib/shared/assets/fonts/Fira-Sans/FiraSans-Bold.ttf',
      ),
    );

    pdf.registerFont(
      'Fira-Sans-Medium',
      path.join(
        this.cwd,
        'src/lib/shared/assets/fonts/Fira-Sans/FiraSans-Medium.ttf',
      ),
    );

    pdf.registerFont(
      'Fira-Sans-Light',
      path.join(
        this.cwd,
        'src/lib/shared/assets/fonts/Fira-Sans/FiraSans-Light.ttf',
      ),
    );
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

  scale_pdf() {
    const contentWidth = this.px2MM(1920);
    const contentHeight = this.px2MM(1080);

    const scaleX = 841.89 / contentWidth;
    const scaleY = 595.28 / contentHeight;
    const scale = Math.min(scaleX, scaleY);
    return scale;
  }
}
