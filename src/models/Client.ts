import mongoose from 'mongoose';

export interface IClientLoginDetail {
  _id?: string;
  website: string;
  url: string;
  username: string;
  password: string;
  createdBy?: string;
  editedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientNote {
  _id?: string;
  title: string;
  content: string;
  createdBy?: string; // Username who created the note
  editedBy?: string; // Username who last edited the note
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: string;
  name: string;
  notes: IClientNote[];
  loginDetails: IClientLoginDetail[];
  createdAt: Date;
  updatedAt: Date;
}

// Login details subdocument schema
const LoginDetailSchema = new mongoose.Schema(
  {
    website: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      required: false,
    },
    editedBy: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

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
    createdBy: {
      type: String,
      required: false,
    },
    editedBy: {
      type: String,
      required: false,
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
    loginDetails: {
      type: [LoginDetailSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'clientsv2' // Use a different collection name
  }
);

export default mongoose.models.ClientV2 || mongoose.model('ClientV2', ClientSchema);