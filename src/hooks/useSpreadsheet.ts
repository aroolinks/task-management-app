import { useState, useEffect, useCallback } from 'react';

export const SPREADSHEET_ROWS = 50;
export const SPREADSHEET_COLS = 8;
export const SPREADSHEET_SHEETS_PER_MONTH = 4;
export const SPREADSHEET_YEARS = [2026, 2027, 2028, 2029, 2030];

export interface SpreadsheetSheet {
  sheetIndex: number;
  data: string[][];
}

function emptyGrid(): string[][] {
  return Array.from({ length: SPREADSHEET_ROWS }, () => Array.from({ length: SPREADSHEET_COLS }, () => ''));
}

export function useSpreadsheet(year: number, month: number) {
  const [sheets, setSheets] = useState<SpreadsheetSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const fetchSheets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/spreadsheet?year=${year}&month=${month}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch spreadsheet');
      }

      if (data.success && Array.isArray(data.data)) {
        const formatted: SpreadsheetSheet[] = data.data.map((sheet: { sheetIndex: number; data: string[][] }) => ({
          sheetIndex: sheet.sheetIndex,
          data: sheet.data && sheet.data.length === SPREADSHEET_ROWS ? sheet.data : emptyGrid(),
        }));
        setSheets(formatted.sort((a, b) => a.sheetIndex - b.sheetIndex));
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching spreadsheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch spreadsheet');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // Instant, network-free update so typing never feels laggy.
  const updateCellLocal = useCallback((sheetIndex: number, row: number, col: number, value: string) => {
    setSheets(prev =>
      prev.map(sheet => {
        if (sheet.sheetIndex !== sheetIndex) return sheet;
        const nextData = sheet.data.map(r => [...r]);
        nextData[row][col] = value;
        return { ...sheet, data: nextData };
      })
    );
  }, []);

  // Persists a single cell (called on blur, not on every keystroke, to avoid
  // firing a request per character typed).
  const persistCell = useCallback(async (sheetIndex: number, row: number, col: number, value: string) => {
    const cellKey = `${sheetIndex}-${row}-${col}`;
    setSavingCell(cellKey);

    try {
      const response = await fetch('/api/spreadsheet/cell', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, sheetIndex, row, col, value }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save cell');
      }
      setError(null);
    } catch (err) {
      console.error('Error saving cell:', err);
      setError(err instanceof Error ? err.message : 'Failed to save cell');
    } finally {
      setSavingCell(current => (current === cellKey ? null : current));
    }
  }, [year, month]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  return {
    sheets,
    loading,
    error,
    savingCell,
    updateCellLocal,
    persistCell,
    refreshSheets: fetchSheets,
  };
}
