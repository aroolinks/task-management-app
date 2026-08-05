import mongoose from 'mongoose';

export const SPREADSHEET_ROWS = 50;
export const SPREADSHEET_COLS = 8;
export const SPREADSHEET_SHEETS_PER_MONTH = 4;
export const SPREADSHEET_YEARS = [2026, 2027, 2028, 2029, 2030];

export interface ISpreadsheetSheet {
  _id: string;
  year: number;
  month: number; // 0-11
  sheetIndex: number; // 0-3 (Sheet 1-4)
  data: string[][];
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpreadsheetSheetSchema = new mongoose.Schema<ISpreadsheetSheet>(
  {
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 0,
      max: 11,
    },
    sheetIndex: {
      type: Number,
      required: true,
      min: 0,
      max: SPREADSHEET_SHEETS_PER_MONTH - 1,
    },
    // Stored as Mixed rather than a typed nested array so dot-path cell
    // updates (e.g. "data.3.5") can target a single array index directly
    // without Mongoose's nested-array casting getting in the way.
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    updatedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

SpreadsheetSheetSchema.index({ year: 1, month: 1, sheetIndex: 1 }, { unique: true });

export default mongoose.models.SpreadsheetSheet || mongoose.model<ISpreadsheetSheet>('SpreadsheetSheet', SpreadsheetSheetSchema);
