import mongoose from 'mongoose';

export interface IIncome {
  _id: string;
  description: string;
  clientName?: string;
  amount: number;
  category: string;
  date: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new mongoose.Schema<IIncome>(
  {
    description: {
      type: String,
      required: [true, 'Please provide a description for this payment.'],
      maxlength: [200, 'Description cannot be more than 200 characters'],
      trim: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount for this payment.'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date for this payment.'],
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

export default mongoose.models.Income || mongoose.model<IIncome>('Income', IncomeSchema);
