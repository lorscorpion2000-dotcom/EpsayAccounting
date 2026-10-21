import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';

export interface GridColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  width?: string;
}

interface ExcelLikeGridProps {
  columns: GridColumn[];
  rows: Record<string, any>[];
  onChange: (updatedRows: Record<string, any>[]) => void;
  onAddRow?: () => void;
}

export const ExcelLikeGrid: React.FC<ExcelLikeGridProps> = ({
  columns,
  rows,
  onChange,
  onAddRow,
}) => {
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  // تغییر مقدار سلول
  const handleCellChange = (rowIndex: number, colKey: string, value: any) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [colKey]: value };
    onChange(updated);
  };

  // پشتیبانی از Paste اکسل
  const handlePaste = (e: ClipboardEvent<HTMLTableElement>, startRow: number, startColIndex: number) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const pastedRows = pasteData.split(/\r\n|\n|\r/).filter((r) => r.trim() !== '');

    const updated = [...rows];
    pastedRows.forEach((rowStr, rIdx) => {
      const targetRowIdx = startRow + rIdx;
      const cellValues = rowStr.split('\t');

      if (!updated[targetRowIdx]) {
        updated[targetRowIdx] = {};
      }

      cellValues.forEach((val, cIdx) => {
        const targetCol = columns[startColIndex + cIdx];
        if (targetCol) {
          const cleanVal = targetCol.type === 'number' ? Number(val.replace(/,/g, '')) || 0 : val.trim();
          updated[targetRowIdx][targetCol.key] = cleanVal;
        }
      });
    });

    onChange(updated);
  };

  // پیمایش با کیبورد (Enter و Tab)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (colIndex < columns.length - 1) {
        setActiveCell({ rowIndex, colKey: columns[colIndex + 1].key });
      } else if (rowIndex < rows.length - 1) {
        setActiveCell({ rowIndex: rowIndex + 1, colKey: columns[0].key });
      } else if (onAddRow) {
        onAddRow();
        setActiveCell({ rowIndex: rowIndex + 1, colKey: columns[0].key });
      }
    }
  };

  return (
    <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
      <table ref={gridRef} className="w-full text-sm text-right text-gray-700 border-collapse">
        <thead className="bg-gray-100 text-gray-800 font-semibold border-b border-gray-300">
          <tr>
            <th className="p-2 w-12 text-center border-l border-gray-300">#</th>
            {columns.map((col) => (
              <th key={col.key} className="p-2 border-l border-gray-300" style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-blue-50/50 border-b border-gray-200">
              <td className="p-2 text-center bg-gray-50 border-l border-gray-300 font-mono text-xs">
                {rIdx + 1}
              </td>
              {columns.map((col, cIdx) => {
                const isActive = activeCell?.rowIndex === rIdx && activeCell?.colKey === col.key;
                return (
                  <td
                    key={col.key}
                    className={`p-1 border-l border-gray-200 ${isActive ? 'ring-2 ring-blue-500 bg-white' : ''}`}
                    onPaste={(e) => handlePaste(e, rIdx, cIdx)}
                  >
                    {col.type === 'select' ? (
                      <select
                        value={row[col.key] || ''}
                        onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                        className="w-full p-1 bg-transparent focus:outline-none"
                      >
                        <option value="">انتخاب کنید...</option>
                        {col.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={col.type === 'number' ? 'number' : 'text'}
                        value={row[col.key] ?? ''}
                        onChange={(e) =>
                          handleCellChange(
                            rIdx,
                            col.key,
                            col.type === 'number' ? Number(e.target.value) : e.target.value
                          )
                        }
                        onFocus={() => setActiveCell({ rowIndex: rIdx, colKey: col.key })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                        className="w-full p-1 bg-transparent focus:outline-none"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};