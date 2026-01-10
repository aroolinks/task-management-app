import mongoose from 'mongoose';

export interface IClientNote {
  _id?: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: string;
  name: string;
  notes: IClientNote[];
  createdAt: Date;
  updatedAt: Date;
}

// Simple schema without complex validation
const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    notes: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'clientsv2' // Use a different collection name
  }
);

export default mongoose.models.ClientV2 || mongoose.model('ClientV2', ClientSchema);