import mongoose from 'mongoose';

export interface ICompanyDataCategory {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyDataCategorySchema = new mongoose.Schema<ICompanyDataCategory>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a company data category name.'],
      maxlength: [100, 'Company data category name cannot be more than 100 characters'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompanyDataCategory || mongoose.model<ICompanyDataCategory>('CompanyDataCategory', CompanyDataCategorySchema);
