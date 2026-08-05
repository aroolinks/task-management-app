import mongoose from 'mongoose';

export interface IExpenseCategory {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new mongoose.Schema<IExpenseCategory>(
  {
    name: {
      type: String,
      required: [true, 'Please provide an expense category name.'],
      maxlength: [100, 'Expense category name cannot be more than 100 characters'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ExpenseCategory || mongoose.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema);
