import { FormulaRecord, DocumentElement } from '../types/index.ts';

export function extractFormulasFromElements(
  documentId: string,
  userId: string,
  elements: DocumentElement[]
): FormulaRecord[] {
  const formulas: FormulaRecord[] = [];
  let formulaCounter = 0;

  let currentSection = 'General';

  elements.forEach((el) => {
    if (el.type === 'heading' || el.type === 'title') {
      currentSection = el.text;
    }

    if (el.type === 'formula') {
      formulaCounter++;
      formulas.push({
        id: `form_${documentId}_${formulaCounter}`,
        documentId,
        userId,
        page: el.page,
        formula: el.text,
        formulaType: el.text.includes('\n') || el.text.length > 30 ? 'display' : 'inline',
        associatedSection: currentSection,
        boundingBox: el.boundingBox,
        readingOrderIndex: el.readingOrderIndex,
      });
    } else {
      // Check for inline math equations like E = mc^2 or LaTeX math tags
      const inlineMathRegex = /(\$\$[^\$]+\$\$|\\\[[^\]]+\\\]|\b[A-Za-z]\s*=\s*[\d\w\+\-\*\/\^\(\)]+\b)/g;
      const matches = el.text.match(inlineMathRegex);
      if (matches && matches.length > 0) {
        matches.forEach((m) => {
          if (m.length > 4 && !/^\d+\s*=\s*\d+$/.test(m)) {
            formulaCounter++;
            formulas.push({
              id: `form_${documentId}_${formulaCounter}`,
              documentId,
              userId,
              page: el.page,
              formula: m,
              formulaType: 'inline',
              associatedSection: currentSection,
              boundingBox: el.boundingBox,
              readingOrderIndex: el.readingOrderIndex,
            });
          }
        });
      }
    }
  });

  return formulas;
}
