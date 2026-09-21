import { TableRecord, DocumentElement, BoundingBox } from '../types/index.ts';

export function extractTablesFromElements(
  documentId: string,
  userId: string,
  elements: DocumentElement[]
): TableRecord[] {
  const tables: TableRecord[] = [];
  let tableIndex = 0;

  // Filter for table elements or text containing markdown/tabulated data
  const tableElements = elements.filter(
    (el) =>
      el.type === 'table' ||
      (el.text.includes('|') && el.text.split('\n').length >= 2) ||
      /\b(?:Year|Fiscal Year|Quarter|Metric|Category|Model|Revenue|Profit|Accuracy|Precision)\b.*\b\d+/i.test(el.text)
  );

  tableElements.forEach((el, elIdx) => {
    const rawLines = el.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let headers: string[] = [];
    let rows: string[][] = [];
    let title = `Table ${tableIndex + 1}: Extracted Data (Page ${el.page})`;

    // Check if the previous element was a table caption/heading e.g. "Table 1: Financial Benchmarks"
    if (elIdx > 0) {
      const prev = tableElements[elIdx - 1];
      if (/^(?:Table\s+\d+|TAB\.\s*\d+):?/i.test(prev.text) && !prev.text.includes('|')) {
        title = prev.text;
      }
    }

    // Check if first line inside element is a title e.g. "Table 1: Financial Results 2024-2025"
    if (rawLines.length > 0 && /^(?:Table\s+\d+|TAB\.\s*\d+):?/i.test(rawLines[0]) && !rawLines[0].includes('|')) {
      title = rawLines[0];
      rawLines.shift();
    }

    // Check for markdown formatted table: | Col 1 | Col 2 |
    const isMarkdownTable = rawLines.some((l) => l.startsWith('|') && l.endsWith('|'));

    if (isMarkdownTable) {
      const cleanLines = rawLines.filter((l) => !l.match(/^\|?\s*[-:]+[-| :]*\|?$/)); // Remove divider line |---|---|
      if (cleanLines.length > 0) {
        headers = cleanLines[0]
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        for (let i = 1; i < cleanLines.length; i++) {
          const cells = cleanLines[i]
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
      }
    } else {
      // Delimited by tabs or multiple spaces or commas
      if (rawLines.length >= 2) {
        headers = rawLines[0].split(/\t|\s{2,}|,\s*/).map((s) => s.trim()).filter(Boolean);
        for (let i = 1; i < rawLines.length; i++) {
          const cells = rawLines[i].split(/\t|\s{2,}|,\s*/).map((s) => s.trim()).filter(Boolean);
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
      }
    }

    // If there are no data rows (e.g. it was just a caption line like "Table 1: Financial Benchmarks"), skip creating an empty table
    if (headers.length === 0 || rows.length === 0) {
      return;
    }

    tableIndex++;
    const tableId = `table_${tableIndex.toString().padStart(2, '0')}`;

    // Generate Markdown representation
    const markdownLines: string[] = [];
    markdownLines.push(`| ${headers.join(' | ')} |`);
    markdownLines.push(`| ${headers.map(() => '---').join(' | ')} |`);
    rows.forEach((r) => {
      // Pad or trim row to match headers count
      const paddedRow = headers.map((_, idx) => (r[idx] !== undefined ? r[idx] : '-'));
      markdownLines.push(`| ${paddedRow.join(' | ')} |`);
    });
    const markdown = markdownLines.join('\n');

    // Generate Searchable Representation:
    // e.g. "Table: Financial Results. In 2024: Revenue is 100, Profit is 20. In 2025: Revenue is 120, Profit is 30."
    const searchableSentences: string[] = [title];
    rows.forEach((row) => {
      const parts: string[] = [];
      headers.forEach((h, colIdx) => {
        if (row[colIdx]) {
          parts.push(`${h}: ${row[colIdx]}`);
        }
      });
      if (parts.length > 0) {
        searchableSentences.push(parts.join(', '));
      }
    });
    const searchableText = `${title}\n${searchableSentences.join('. ')}`;

    tables.push({
      id: `tbl_rec_${documentId}_${tableIndex}`,
      tableId,
      documentId,
      userId,
      page: el.page,
      title,
      headers,
      rows,
      markdown,
      searchableText,
      boundingBox: el.boundingBox,
      readingOrderIndex: el.readingOrderIndex,
    });
  });

  return tables;
}
