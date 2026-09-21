import { DocumentElement } from '../types/index.ts';

export interface ReadingOrderReconstructionResult {
  elements: DocumentElement[];
  reorderedCount: number;
  columnsDetected: number;
  scrambledPairsCount: number;
}

export function reconstructReadingOrder(
  elements: DocumentElement[],
  isMultiColumnDoc: boolean
): ReadingOrderReconstructionResult {
  // Group elements by page
  const pageMap = new Map<number, DocumentElement[]>();
  elements.forEach((el) => {
    const list = pageMap.get(el.page) || [];
    list.push(el);
    pageMap.set(el.page, list);
  });

  const reorderedElements: DocumentElement[] = [];
  let globalOrderIndex = 1;
  let reorderedCount = 0;
  let scrambledPairsCount = 0;

  // Process pages in numerical order
  const pages = Array.from(pageMap.keys()).sort((a, b) => a - b);

  for (const page of pages) {
    const pageElems = pageMap.get(page)!;

    // Detect if page contains two columns based on bounding box X coordinates
    const leftMargin = 50;
    const midX = 290;
    const rightMargin = 545;

    // Count how many elements sit strictly in column 1 vs column 2
    let col1Count = 0;
    let col2Count = 0;

    pageElems.forEach((el) => {
      if (el.type === 'header' || el.type === 'footer' || el.type === 'page_number' || el.type === 'title') {
        return;
      }
      const centerX = el.boundingBox.x + el.boundingBox.width / 2;
      if (centerX < midX) {
        col1Count++;
        el.column = 1;
      } else {
        col2Count++;
        el.column = 2;
      }
    });

    const isPageMultiColumn = isMultiColumnDoc || (col1Count >= 2 && col2Count >= 2);

    // Categories:
    // 1. Headers (at top)
    // 2. Titles & Full-width spanning headers
    // 3. Multi-column body elements:
    //    - If multi-column: Column 1 sorted by Y ascending, THEN Column 2 sorted by Y ascending
    //    - If single-column: sorted by Y ascending
    // 4. Footers & Page numbers (at bottom)

    const headers = pageElems.filter((e) => e.type === 'header').sort((a, b) => a.boundingBox.y - b.boundingBox.y);
    const titles = pageElems
      .filter((e) => e.type === 'title' || (e.type === 'heading' && e.boundingBox.y < 120 && e.boundingBox.width > 350))
      .sort((a, b) => a.boundingBox.y - b.boundingBox.y);

    const footersAndPageNums = pageElems
      .filter((e) => e.type === 'footer' || e.type === 'page_number')
      .sort((a, b) => a.boundingBox.y - b.boundingBox.y);

    const excludedIds = new Set([
      ...headers.map((e) => e.id),
      ...titles.map((e) => e.id),
      ...footersAndPageNums.map((e) => e.id),
    ]);

    const bodyElements = pageElems.filter((e) => !excludedIds.has(e.id));

    let sortedBody: DocumentElement[] = [];

    if (isPageMultiColumn) {
      // Split into Column 1 and Column 2
      const col1 = bodyElements
        .filter((e) => e.column === 1 || e.boundingBox.x < midX)
        .sort((a, b) => a.boundingBox.y - b.boundingBox.y);

      const col2 = bodyElements
        .filter((e) => e.column === 2 || e.boundingBox.x >= midX)
        .sort((a, b) => a.boundingBox.y - b.boundingBox.y);

      // Reconstruct human reading order: Entire Col 1 top-to-bottom, then Entire Col 2 top-to-bottom
      sortedBody = [...col1, ...col2];
    } else {
      // Single column: Top-to-bottom
      sortedBody = bodyElements.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
    }

    // Assemble page ordered stream
    const pageFinalOrder = [...headers, ...titles, ...sortedBody, ...footersAndPageNums];

    // Assign readingOrderIndex and track reordering difference from naive extraction
    pageFinalOrder.forEach((elem) => {
      const oldIndex = elem.naiveOrderIndex;
      const newIndex = globalOrderIndex++;
      if (oldIndex !== newIndex) {
        reorderedCount++;
      }
      elem.readingOrderIndex = newIndex;
      reorderedElements.push(elem);
    });

    // Calculate how many inverted pairs existed in naive scanline order
    for (let i = 0; i < pageFinalOrder.length - 1; i++) {
      for (let j = i + 1; j < pageFinalOrder.length; j++) {
        if (pageFinalOrder[i].naiveOrderIndex > pageFinalOrder[j].naiveOrderIndex) {
          scrambledPairsCount++;
        }
      }
    }
  }

  return {
    elements: reorderedElements,
    reorderedCount,
    columnsDetected: isMultiColumnDoc ? 2 : 1,
    scrambledPairsCount,
  };
}
