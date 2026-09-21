import fs from 'fs';
import * as pdfParseModule from 'pdf-parse';
import mammoth from 'mammoth';

const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

export interface RawExtractedBlock {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  fontHint?: string;
  fontSize?: number;
}

export interface ExtractedDocumentContent {
  text: string;
  pageCount: number;
  blocks: RawExtractedBlock[];
  rawMetadata?: Record<string, any>;
}

export async function extractDocumentContent(
  filePath: string,
  fileType: 'pdf' | 'docx' | 'txt'
): Promise<ExtractedDocumentContent> {
  const fileBuffer = fs.readFileSync(filePath);

  if (fileType === 'txt') {
    const text = fileBuffer.toString('utf-8');
    const lines = text.split(/\r?\n/);
    const blocks: RawExtractedBlock[] = [];
    let currentParagraph: string[] = [];
    let currentTableLines: string[] = [];
    let yPos = 40;
    let page = 1;

    const flushPara = () => {
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join(' ');
        blocks.push({
          page,
          text: paraText,
          x: 50,
          y: yPos,
          width: 500,
          height: Math.max(20, Math.ceil(paraText.length / 70) * 16),
          pageWidth: 600,
          pageHeight: 800,
        });
        yPos += Math.max(28, Math.ceil(paraText.length / 70) * 16 + 12);
        if (yPos > 720) {
          page++;
          yPos = 40;
        }
        currentParagraph = [];
      }
    };

    const flushTable = () => {
      if (currentTableLines.length > 0) {
        const tableText = currentTableLines.join('\n');
        blocks.push({
          page,
          text: tableText,
          x: 50,
          y: yPos,
          width: 500,
          height: currentTableLines.length * 22 + 10,
          pageWidth: 600,
          pageHeight: 800,
        });
        yPos += currentTableLines.length * 22 + 20;
        if (yPos > 720) {
          page++;
          yPos = 40;
        }
        currentTableLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        flushPara();
        flushTable();
        continue;
      }

      // Check if line is part of a table
      if (line.startsWith('|') || (line.includes('|') && line.endsWith('|'))) {
        flushPara();
        currentTableLines.push(line);
        continue;
      } else if (currentTableLines.length > 0) {
        flushTable();
      }

      const isHeadingLike =
        /^(?:[0-9]+\.\s+[A-Z]|[A-Z\s]{4,60}$|Table\s+\d+|Formula\s+\d+|Equation\s+\d+|Abstract|Introduction|Methodology|Experiments|Results|Discussion|Conclusion|References|\[Column\s*\d+\])/i.test(
          line
        );

      if (isHeadingLike) {
        flushPara();
        blocks.push({
          page,
          text: line,
          x: 50,
          y: yPos,
          width: 500,
          height: 28,
          pageWidth: 600,
          pageHeight: 800,
          fontSize: 14,
        });
        yPos += 36;
        if (yPos > 720) {
          page++;
          yPos = 40;
        }
      } else {
        currentParagraph.push(line);
      }
    }

    flushPara();
    flushTable();

    return {
      text,
      pageCount: page,
      blocks,
    };
  }

  if (fileType === 'docx') {
    const result = await (mammoth as any).extractRawText({ buffer: fileBuffer });
    const text = result.value || '';
    const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
    const blocks: RawExtractedBlock[] = [];
    let page = 1;
    let yPos = 40;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      const height = Math.max(20, Math.ceil(trimmed.length / 70) * 16);
      blocks.push({
        page,
        text: trimmed,
        x: 50,
        y: yPos,
        width: 500,
        height,
        pageWidth: 600,
        pageHeight: 800,
      });
      yPos += height + 16;
      if (yPos > 720) {
        page++;
        yPos = 40;
      }
    }

    return {
      text,
      pageCount: Math.max(1, page),
      blocks,
      rawMetadata: result.messages,
    };
  }

  if (fileType === 'pdf') {
    // Parse PDF text and page delimiters
    const pdfData = await (pdfParse as any)(fileBuffer);
    const text = pdfData.text || '';
    const numPages = Math.max(1, pdfData.numpages || 1);

    // Split text across pages if marked, or distribute intelligently
    const pageSplits = text.split(/\f|\n\s*(?:Page\s+\d+|--\s*\d+\s*--)\s*\n/i);
    const blocks: RawExtractedBlock[] = [];

    const pagesToProcess = pageSplits.length >= numPages ? pageSplits : [text];

    pagesToProcess.forEach((pageContent: string, pageIdx: number) => {
      const pageNum = pageIdx + 1;
      const lines = pageContent.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      let currentPara: string[] = [];
      let yOffset = 50;
      const pageWidth = 595; // A4 standard pt
      const pageHeight = 842;

      const flushPara = (isTitleOrHeading = false) => {
        if (currentPara.length === 0) return;
        const joined = currentPara.join(' ');
        const height = isTitleOrHeading ? 32 : Math.max(20, Math.ceil(joined.length / 65) * 14);

        blocks.push({
          page: pageNum,
          text: joined,
          x: 50,
          y: yOffset,
          width: 495,
          height,
          pageWidth,
          pageHeight,
          fontSize: isTitleOrHeading ? 16 : 10,
        });

        yOffset += height + 12;
        currentPara = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isHeaderLike =
          /^(Abstract|Introduction|Related Work|Methodology|Experiments|Results|Discussion|Conclusion|References|Table \d+|Figure \d+|Algorithm \d+|Theorem \d+|\d+\.\s+[A-Z])/i.test(line) ||
          (line.length < 50 && line === line.toUpperCase() && line.length > 3);

        const isTableLine = line.includes('|') || /\b\d{4}\b.*\b\d+\b/.test(line);

        if (isHeaderLike || isTableLine) {
          flushPara();
          currentPara.push(line);
          flushPara(isHeaderLike);
        } else {
          currentPara.push(line);
          if (currentPara.length >= 4) {
            flushPara(false);
          }
        }
      }
      flushPara(false);
    });

    return {
      text,
      pageCount: numPages,
      blocks,
      rawMetadata: pdfData.info,
    };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
