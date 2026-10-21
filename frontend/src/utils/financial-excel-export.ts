/**
 * موتور تولید خروجی اکسل زنده و فرمول‌دار برای صورت‌های مالی و گزارش‌های بودجه
 */

export interface ExcelColumn {
  header: string;
  key: string;
  type?: 'text' | 'number' | 'currency';
}

export interface ExcelRowData {
  [key: string]: any;
}

export interface FinancialStatementExportOptions {
  title: string;
  companyName?: string;
  periodText?: string;
  columns: ExcelColumn[];
  rows: ExcelRowData[];
  totalRowKeys?: string[]; // کلید ستون‌هایی که باید مجموع آن‌ها با فرمول =SUM() محاسبه شود
}

/**
 * ساخت فایل اکسل با فرمت XML Spreadsheet (پشتیبانی کامل از فرمول‌های زنده و RTL در اکسل)
 */
export function generateDynamicFinancialExcel({
  title,
  companyName = 'شرکت حسابداری اپسای',
  periodText,
  columns,
  rows,
  totalRowKeys = [],
}: FinancialStatementExportOptions): string {
  const now = new Date().toLocaleDateString('fa-IR');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Vazirmatn" ss:Size="10"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Vazirmatn" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Vazirmatn" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Currency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="Total">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Vazirmatn" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="گزارش مالی" ss:RightToLeft="1">
  <Table>`;

  // ردیف عنوان
  xml += `
   <Row ss:Height="30">
    <Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="Title">
     <Data ss:Type="String">${companyName} - ${title}</Data>
    </Cell>
   </Row>`;

  if (periodText) {
    xml += `
   <Row ss:Height="20">
    <Cell ss:MergeAcross="${columns.length - 1}">
     <Data ss:Type="String">دوره گزارش: ${periodText} | تاریخ دریافت: ${now}</Data>
    </Cell>
   </Row>`;
  }

  xml += `<Row ss:Height="10"></Row>`;

  // ردیف هدر جدول
  xml += `<Row ss:Height="25">`;
  columns.forEach((col) => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${col.header}</Data></Cell>`;
  });
  xml += `</Row>`;

  const startRowIndex = periodText ? 5 : 4;

  // ردیف‌های داده
  rows.forEach((row) => {
    xml += `<Row ss:Height="22">`;
    columns.forEach((col) => {
      const val = row[col.key];
      const isNum = typeof val === 'number';
      const style = isNum ? ' ss:StyleID="Currency"' : '';
      const dataType = isNum ? 'Number' : 'String';
      const displayVal = val !== undefined && val !== null ? val : '';

      xml += `<Cell${style}><Data ss:Type="${dataType}">${displayVal}</Data></Cell>`;
    });
    xml += `</Row>`;
  });

  // ردیف مجموع با فرمول زنده =SUM()
  if (totalRowKeys.length > 0 && rows.length > 0) {
    const endRowIndex = startRowIndex + rows.length - 1;
    xml += `<Row ss:Height="26">`;

    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      if (totalRowKeys.includes(col.key)) {
        const formula = `=SUM(${colLetter}${startRowIndex}:${colLetter}${endRowIndex})`;
        xml += `<Cell ss:StyleID="Total" ss:Formula="${formula}"><Data ss:Type="Number">0</Data></Cell>`;
      } else if (colIdx === 0) {
        xml += `<Cell ss:StyleID="Total"><Data ss:Type="String">جمع کل</Data></Cell>`;
      } else {
        xml += `<Cell ss:StyleID="Total"><Data ss:Type="String"></Data></Cell>`;
      }
    });

    xml += `</Row>`;
  }

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}

/**
 * دانلود مستقیم فایل اکسل فرمول‌دار در مرورگر
 */
export function downloadFinancialExcel(filename: string, xmlContent: string) {
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}