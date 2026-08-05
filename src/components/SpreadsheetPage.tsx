'use client';

import { useMemo, useState } from 'react';
import {
  useSpreadsheet,
  SPREADSHEET_ROWS,
  SPREADSHEET_COLS,
  SPREADSHEET_SHEETS_PER_MONTH,
  SPREADSHEET_YEARS,
} from '@/hooks/useSpreadsheet';

const COLUMN_LABELS = Array.from({ length: SPREADSHEET_COLS }, (_, i) => String.fromCharCode(65 + i));
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SpreadsheetPage() {
  const [selectedYear, setSelectedYear] = useState(SPREADSHEET_YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const { sheets, loading, error, savingCell, updateCellLocal, persistCell } = useSpreadsheet(selectedYear, selectedMonth);

  const activeSheet = useMemo(
    () => sheets.find(s => s.sheetIndex === activeSheetIndex),
    [sheets, activeSheetIndex]
  );

  return (
    <div className="h-full flex">
      {/* Left sidebar: months */}
      <div className="w-44 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Months</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {MONTH_NAMES.map((name, index) => (
            <button
              key={name}
              onClick={() => {
                setSelectedMonth(index);
                setActiveSheetIndex(0);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMonth === index
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 min-w-0">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Spreadsheet <span className="text-gray-400 font-normal">— {MONTH_NAMES[selectedMonth]} {selectedYear}</span>
            </h1>
            <div className="flex items-center gap-3">
              {savingCell && (
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </span>
              )}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SPREADSHEET_YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500">Enter data like a spreadsheet — changes save automatically.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Sheet tabs */}
        <div className="flex items-center gap-1 mb-3 border-b border-gray-200 overflow-x-auto">
          {Array.from({ length: SPREADSHEET_SHEETS_PER_MONTH }, (_, i) => i).map((sheetIndex) => (
            <button
              key={sheetIndex}
              onClick={() => setActiveSheetIndex(sheetIndex)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                activeSheetIndex === sheetIndex
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Sheet {sheetIndex + 1}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading spreadsheet...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-auto bg-white">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 w-12 h-8 bg-gray-100 border border-gray-200 text-xs font-medium text-gray-500"></th>
                  {COLUMN_LABELS.map((label) => (
                    <th
                      key={label}
                      className="sticky top-0 z-10 w-32 h-8 bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: SPREADSHEET_ROWS }, (_, row) => (
                  <tr key={row}>
                    <td className="sticky left-0 z-10 w-12 h-8 bg-gray-100 border border-gray-200 text-center text-xs font-medium text-gray-500">
                      {row + 1}
                    </td>
                    {Array.from({ length: SPREADSHEET_COLS }, (_, col) => {
                      const value = activeSheet?.data[row]?.[col] ?? '';
                      return (
                        <td key={col} className="border border-gray-200 p-0">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateCellLocal(activeSheetIndex, row, col, e.target.value)}
                            onBlur={(e) => persistCell(activeSheetIndex, row, col, e.target.value)}
                            className="w-32 h-8 px-2 text-sm text-gray-900 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-400"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
