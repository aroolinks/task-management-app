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

// Note subdocument schema
const NoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Simple schema without complex validation
const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    notes: {
      type: [NoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'clientsv2' // Use a different collection name
  }
);

export default mongoose.models.ClientV2 || mongoose.model('ClientV2', ClientSchema);