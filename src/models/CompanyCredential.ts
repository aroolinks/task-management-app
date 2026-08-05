import mongoose from 'mongoose';

export interface ICompanyCredential {
  _id: string;
  title: string;
  category: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
  createdBy?: string;
  editedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyCredentialSchema = new mongoose.Schema<ICompanyCredential>(
  {
    title: {
      type: String,
      required: [true, 'Please provide a name for this credential.'],
      maxlength: [150, 'Title cannot be more than 150 characters'],
    },
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },
    url: {
      type: String,
      default: '',
      maxlength: [500, 'URL cannot be more than 500 characters'],
    },
    username: {
      type: String,
      required: [true, 'Please provide a username or account identifier.'],
      maxlength: [200, 'Username cannot be more than 200 characters'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password.'],
    },
    notes: {
      type: String,
      default: '',
      maxlength: [2000, 'Notes cannot be more than 2000 characters'],
    },
    createdBy: {
      type: String,
    },
    editedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'companycredentials',
  }
);

export default mongoose.models.CompanyCredential || mongoose.model<ICompanyCredential>('CompanyCredential', CompanyCredentialSchema);
