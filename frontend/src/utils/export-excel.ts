// src/utils/export-excel.ts
// Lazy-loads xlsx-js-style (849 KB) only when Excel export is triggered.
// Static imports of xlsx-js-style anywhere in the app force the entire
// 849 KB chunk to load on every page. This helper fixes that.

export interface SheetConfig {
  name: string;
  rows: any[];
  cols?: { wch: number }[];
}

export interface ExportOptions {
  filename: string;
  sheets: SheetConfig[];
}

export async function exportToExcel(options: ExportOptions): Promise<void> {
  const [XLSX, { styleWorksheet, makeWorkbook }] = await Promise.all([
    import('xlsx-js-style'),
    import('./excel-style'),
  ]);

  const wb = makeWorkbook();

  for (const sheet of options.sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    styleWorksheet(ws, sheet.rows);
    if (sheet.cols) {
      ws['!cols'] = sheet.cols;
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, options.filename);
}