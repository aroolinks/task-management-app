import mongoose from 'mongoose';

export interface IExpense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new mongoose.Schema<IExpense>(
  {
    description: {
      type: String,
      required: [true, 'Please provide a description for this expense.'],
      maxlength: [200, 'Description cannot be more than 200 characters'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount for this expense.'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date for this expense.'],
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
