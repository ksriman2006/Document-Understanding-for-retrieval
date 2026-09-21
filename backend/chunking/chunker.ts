import { DocumentChunk, DocumentElement, TableRecord } from '../types/index.ts';

export function createStructureAwareChunks(
  documentId: string,
  userId: string,
  elements: DocumentElement[],
  tables: TableRecord[]
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  // Elements are sorted in reconstructed reading order
  const sortedElements = [...elements].sort((a, b) => a.readingOrderIndex - b.readingOrderIndex);

  let currentSection = 'Introduction / Document Overview';
  let currentGroup: DocumentElement[] = [];
  let currentStartOrder = 1;
  let currentEndOrder = 1;
  let currentPage = 1;

  const flushGroup = (chunkType: DocumentChunk['chunkType']) => {
    if (currentGroup.length === 0) return;
    chunkIndex++;

    const contentText = currentGroup
      .map((e) => {
        if (e.type === 'heading' || e.type === 'subheading') {
          return `### ${e.text}`;
        }
        if (e.type === 'list') {
          return `• ${e.text.replace(/^[-*•]\s*/, '')}`;
        }
        return e.text;
      })
      .join('\n\n');

    chunks.push({
      id: `chunk_${documentId}_${chunkIndex.toString().padStart(3, '0')}`,
      documentId,
      userId,
      page: currentPage,
      section: currentSection,
      chunkType,
      content: contentText,
      elementIds: currentGroup.map((e) => e.id),
      sourcePosition: {
        page: currentPage,
        readingOrderStart: currentStartOrder,
        readingOrderEnd: currentEndOrder,
      },
    });

    currentGroup = [];
  };

  // Associate tables with nearest preceding heading or context
  const tableByElementId = new Map<string, TableRecord>();
  tables.forEach((t) => {
    const matchedElem = elements.find((e) => e.page === t.page && e.readingOrderIndex === t.readingOrderIndex);
    if (matchedElem) {
      tableByElementId.set(matchedElem.id, t);
    }
  });

  for (let i = 0; i < sortedElements.length; i++) {
    const el = sortedElements[i];
    if (el.type === 'header' || el.type === 'footer' || el.type === 'page_number') {
      // Exclude running headers and footers from semantic chunks
      continue;
    }

    if (currentGroup.length === 0) {
      currentStartOrder = el.readingOrderIndex;
      currentPage = el.page;
    }
    currentEndOrder = el.readingOrderIndex;

    // Heading encountered: flush previous block and update section context
    if (el.type === 'title' || el.type === 'heading') {
      flushGroup('heading_paragraph');
      currentSection = el.text;
      currentGroup.push(el);
      currentStartOrder = el.readingOrderIndex;
      currentPage = el.page;
      continue;
    }

    // Subheading
    if (el.type === 'subheading') {
      if (currentGroup.length > 2) {
        flushGroup('section');
      }
      currentSection = `${currentSection} > ${el.text}`;
      currentGroup.push(el);
      continue;
    }

    // Dedicated Table chunking with surrounding section context
    if (el.type === 'table') {
      flushGroup('heading_paragraph');
      const tableRecord = tableByElementId.get(el.id) || tables.find((t) => t.page === el.page);
      chunkIndex++;

      const tableContent = tableRecord
        ? `[TABLE CONTEXT: ${currentSection}]\n${tableRecord.title}\n${tableRecord.markdown}\n\nSearchable Details:\n${tableRecord.searchableText}`
        : `[TABLE: ${currentSection}]\n${el.text}`;

      chunks.push({
        id: `chunk_${documentId}_${chunkIndex.toString().padStart(3, '0')}`,
        documentId,
        userId,
        page: el.page,
        section: currentSection,
        chunkType: 'table_context',
        content: tableContent,
        elementIds: [el.id],
        tableId: tableRecord?.tableId,
        sourcePosition: {
          page: el.page,
          readingOrderStart: el.readingOrderIndex,
          readingOrderEnd: el.readingOrderIndex,
        },
      });
      continue;
    }

    // List item handling
    if (el.type === 'list') {
      currentGroup.push(el);
      // Group up to 5 list items with their heading
      if (currentGroup.filter((e) => e.type === 'list').length >= 6) {
        flushGroup('list_group');
      }
      continue;
    }

    // Standard Paragraph or Formula
    currentGroup.push(el);

    // If accumulated content is substantial or natural boundary reached
    const totalChars = currentGroup.reduce((acc, curr) => acc + curr.text.length, 0);
    if (totalChars > 650) {
      flushGroup('heading_paragraph');
    }
  }

  flushGroup('heading_paragraph');

  return chunks;
}
