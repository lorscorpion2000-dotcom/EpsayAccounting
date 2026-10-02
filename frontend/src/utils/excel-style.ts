import * as XLSX from 'xlsx-js-style';

/**
 * استایل‌دهی کاربرگ اکسل:
 * - سرصفحه با رنگ بنفش برند
 * - بدنه با ردیف‌های راه‌راه
 * - تراز مناسب
 */
export function styleWorksheet(ws: XLSX.WorkSheet, rows: any[]) {
  if (!ws || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const colCount = headers.length;

  // ===== Header Row =====
  headers.forEach((_, i) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[addr]) return;
    ws[addr].s = {
      font: {
        bold: true,
        color: { rgb: 'FFFFFF' },
        name: 'Tahoma',
        sz: 11,
      },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: '7C3AED' },
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true,
      },
      border: {
        top: { style: 'thin', color: { rgb: '5B21B6' } },
        bottom: { style: 'thin', color: { rgb: '5B21B6' } },
        left: { style: 'thin', color: { rgb: '5B21B6' } },
        right: { style: 'thin', color: { rgb: '5B21B6' } },
      },
    };
  });

  // ===== Data Rows =====
  for (let r = 1; r <= rows.length; r++) {
    const isTotalRow = r === rows.length &&
      (String(rows[r - 1]?.[headers[0]] || '').includes('جمع') ||
       String(rows[r - 1]?.[headers[0]] || '').includes('مجموع'));

    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const isNumber = typeof ws[addr].v === 'number';

      ws[addr].s = {
        font: {
          name: 'Tahoma',
          sz: 10,
          bold: isTotalRow,
          color: isTotalRow ? { rgb: '5B21B6' } : undefined,
        },
        fill: isTotalRow
          ? { patternType: 'solid', fgColor: { rgb: 'EDE9FE' } }
          : r % 2 === 0
            ? { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }
            : { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: {
          vertical: 'center',
          horizontal: isNumber ? 'left' : 'right',
          wrapText: false,
        },
        border: {
          bottom: { style: 'hair', color: { rgb: 'E2E8F0' } },
          ...(isTotalRow
            ? { top: { style: 'medium', color: { rgb: '7C3AED' } } }
            : {}),
        },
      };
    }
  }

  // ===== Column Widths =====
  ws['!cols'] = headers.map((h) => {
    const maxLen = Math.max(
      String(h).length,
      ...rows.map((row) => {
        const v = row[h];
        if (v === null || v === undefined) return 0;
        return String(v).length;
      }),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 45) };
  });

  // ===== Row Heights =====
  ws['!rows'] = [{ hpt: 28 }];
  for (let r = 1; r <= rows.length; r++) {
    ws['!rows'].push({ hpt: 22 });
  }
}

/**
 * ساختار استاندارد Workbook با RTL
 */
export function makeWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  wb.Workbook = {
    Views: [{ RTL: true }],
  };
  return wb;
}
