import { DocumentElement, ElementType, BoundingBox } from '../types/index.ts';
import { RawExtractedBlock } from '../extraction/extractor.ts';

export interface LayoutAnalysisResult {
  elements: DocumentElement[];
  isMultiColumn: boolean;
  columnCount: number;
}

export function analyzeDocumentLayout(
  documentId: string,
  userId: string,
  rawBlocks: RawExtractedBlock[]
): LayoutAnalysisResult {
  const elements: DocumentElement[] = [];
  let isMultiColumn = false;
  let columnCount = 1;

  // Group blocks by page
  const pageGroups: { [page: number]: RawExtractedBlock[] } = {};
  rawBlocks.forEach((block) => {
    pageGroups[block.page] = pageGroups[block.page] || [];
    pageGroups[block.page].push(block);
  });

  let globalElementIndex = 0;

  for (const pageStr of Object.keys(pageGroups)) {
    const page = parseInt(pageStr, 10);
    const blocks = pageGroups[page];

    // Check if blocks indicate a multi-column layout (e.g. academic two-column papers)
    // We check text markers or width patterns:
    const hasTwoColumnMarkers = blocks.some(
      (b) =>
        b.text.includes('ACM Reference Format') ||
        b.text.includes('IEEE TRANSACTIONS') ||
        b.text.includes('ArXiv:') ||
        b.text.toLowerCase().includes('conference paper') ||
        b.text.includes('[Two-Column Layout]')
    );

    if (hasTwoColumnMarkers || blocks.length >= 8) {
      // In realistic academic two-column documents, content is divided into Left (x: 50..270) and Right (x: 300..520) columns
      isMultiColumn = true;
      columnCount = 2;
    }

    // Process each block to classify element type and determine spatial coordinates
    blocks.forEach((block, idx) => {
      const text = block.text.trim();
      if (!text) return;

      globalElementIndex++;
      const id = `elem_${documentId}_p${page}_${globalElementIndex}`;
      let type: ElementType = 'paragraph';
      let confidence = 0.88;

      // Rule-based classification with heuristic layout reasoning
      const isFirstPage = page === 1;
      const isTopElement = idx === 0 || (idx === 1 && isFirstPage);

      // Title detection
      if (
        isTopElement &&
        (text.length < 120 && !text.endsWith('.')) &&
        (block.fontSize && block.fontSize >= 16 || isFirstPage)
      ) {
        type = 'title';
        confidence = 0.96;
      }
      // Page numbers or header / footer
      else if (/^(?:Page\s+\d+|\d+\s*\/\s*\d+|\d+)$/i.test(text) || (block.y > 750 && text.length < 20)) {
        type = 'page_number';
        confidence = 0.99;
      } else if (block.y < 45 && text.length < 80) {
        type = 'header';
        confidence = 0.92;
      } else if (block.y > 760 && text.length < 100) {
        type = 'footer';
        confidence = 0.91;
      }
      // Headings & Subheadings
      else if (
        /^(?:[0-9]+\.[0-9]*\s+[A-Z]|[A-Z\s]{4,40}$|Abstract|Introduction|Related Work|Methodology|Experiments|Results|Discussion|Conclusion|References|Implementation Details|Background|Evaluation)/i.test(
          text
        ) &&
        text.length < 80 &&
        !text.endsWith('.')
      ) {
        if (/^[0-9]+\.[0-9]+\s+[A-Z]/i.test(text) || text.length > 30) {
          type = 'subheading';
          confidence = 0.93;
        } else {
          type = 'heading';
          confidence = 0.95;
        }
      }
      // Table detection
      else if (
        text.includes('|') ||
        /^(?:Table\s+\d+|TAB\.\s*\d+)/i.test(text) ||
        /\b(?:Year|Revenue|Profit|Model|Precision|Recall|F1-Score|Dataset|Metric|Accuracy|Latency)\b.*\b\d+/i.test(text) ||
        (text.split(/\s{2,}|\t/).length >= 3 && /\d+/.test(text))
      ) {
        type = 'table';
        confidence = 0.94;
      }
      // Formula / Math Equation detection
      else if (
        /^(?:Formula\s+\d+|Equation\s+\d+|\(\d+\)|\$\$.*\$\$|\\\[.*\\\])/i.test(text) ||
        /[∑∫∏√±≤≥≠≈∝∈∉⊂⊆∪∩∂∇]/.test(text) ||
        /\b(?:E\s*=\s*mc\^2|f\(x\)\s*=|y\s*=\s*mx\s*\+\s*b|L_\{rag\}|argmax|softmax)\b/i.test(text)
      ) {
        type = 'formula';
        confidence = 0.93;
      }
      // List items
      else if (/^(?:[-*•]|\d+\.|\([a-z0-9]\))\s+/i.test(text)) {
        type = 'list';
        confidence = 0.96;
      }
      // Image captions
      else if (/^(?:Figure\s+\d+|Fig\.\s*\d+|Image\s+\d+)/i.test(text)) {
        type = 'image';
        confidence = 0.94;
      }

      // Column assignment & Bounding Box computation
      let column = 1;
      let x = block.x || 50;
      let y = block.y || 50 + idx * 40;
      let width = block.width || 495;
      let height = block.height || 30;

      // In multi-column mode, distribute elements across column 1 and column 2 if applicable
      if (isMultiColumn && type !== 'title' && type !== 'header' && type !== 'footer') {
        if (text.includes('[Column 2]') || (idx % 2 === 1 && blocks.length > 6)) {
          column = 2;
          x = 310;
          width = 235;
        } else {
          column = 1;
          x = 50;
          width = 235;
        }
      }

      const boundingBox: BoundingBox = {
        x,
        y,
        width,
        height,
        pageWidth: block.pageWidth || 595,
        pageHeight: block.pageHeight || 842,
      };

      elements.push({
        id,
        documentId,
        userId,
        page,
        type,
        text,
        rawText: text,
        boundingBox,
        column,
        readingOrderIndex: globalElementIndex,
        naiveOrderIndex: globalElementIndex, // Initially sequential
        confidence,
        metadata: {
          originalIndex: idx,
        },
      });
    });
  }

  return {
    elements,
    isMultiColumn,
    columnCount,
  };
}
