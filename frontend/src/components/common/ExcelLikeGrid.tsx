import React, { useState, useRef, useMemo, KeyboardEvent, ClipboardEvent } from 'react';

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

// کامپوننت سرچ درجا برای سلول‌های انتخابی (Select with In-Place Search)
const SearchableSelectCell: React.FC<{
  value: string;
  options?: { value: string; label: string }[];
  onChange: (val: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}> = ({ value, options = [], onChange, onFocus, onKeyDown }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedOpt = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={isOpen ? searchTerm : selectedOpt?.label || ''}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearchTerm('');
          onFocus?.();
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
          onKeyDown?.(e);
        }}
        placeholder="جستجو و انتخاب..."
        className="w-full p-1 bg-transparent focus:outline-none text-xs"
      />
      {isOpen && (
        <div className="absolute z-[9999] right-0 left-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-xl text-xs min-w-[200px]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onMouseDown={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`p-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0 ${
                  opt.value === value ? 'bg-blue-100 font-bold text-blue-800' : ''
                }`}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-400 text-center">موردی یافت نشد</div>
          )}
        </div>
      )}
    </div>
  );
};

export const ExcelLikeGrid: React.FC<ExcelLikeGridProps> = ({
  columns,
  rows,
  onChange,
  onAddRow,
}) => {
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  const handleCellChange = (rowIndex: number, colKey: string, value: any) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [colKey]: value };
    onChange(updated);
  };

  const handlePaste = (e: ClipboardEvent<HTMLElement>, startRow: number, startColIndex: number) => {
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
    <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm pb-40">
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
            <tr
              key={rIdx}
              className="hover:bg-blue-50/50 border-b border-gray-200 relative"
              style={{ zIndex: activeCell?.rowIndex === rIdx ? 50 : rows.length - rIdx }}
            >
              <td className="p-2 text-center bg-gray-50 border-l border-gray-300 font-mono text-xs">
                {rIdx + 1}
              </td>
              {columns.map((col, cIdx) => {
                const isActive = activeCell?.rowIndex === rIdx && activeCell?.colKey === col.key;
                return (
                  <td
                    key={col.key}
                    className={`p-1 border-l border-gray-200 relative ${
                      isActive ? 'ring-2 ring-blue-500 bg-white z-50' : ''
                    }`}
                    style={{ zIndex: isActive ? 50 : undefined }}
                    onPaste={(e) => handlePaste(e, rIdx, cIdx)}
                  >
                    {col.type === 'select' ? (
                      <SearchableSelectCell
                        value={row[col.key] || ''}
                        options={col.options}
                        onChange={(val) => handleCellChange(rIdx, col.key, val)}
                        onFocus={() => setActiveCell({ rowIndex: rIdx, colKey: col.key })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                      />
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