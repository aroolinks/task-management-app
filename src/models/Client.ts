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

export interface IClientTask {
  _id?: string;
  title: string;
  content: string;
  createdBy?: string; // Username who created the task
  editedBy?: string; // Username who last edited the task
  assignedTo?: string; // Username of team member this task is assigned to
  completed?: boolean; // Whether the task is completed
  completedBy?: string; // Username who marked it as completed
  completedAt?: Date; // When it was completed
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientProject {
  _id?: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
  createdBy?: string;
  editedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: string;
  name: string;
  type: 'client' | 'agency';
  tasks: IClientTask[];
  loginDetails: IClientLoginDetail[];
  projects: IClientProject[];
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

// Task subdocument schema
const TaskSchema = new mongoose.Schema(
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
    assignedTo: {
      type: String,
      required: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedBy: {
      type: String,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Project subdocument schema
const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: false,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'on_hold'],
      default: 'active',
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
    type: {
      type: String,
      enum: ['client', 'agency'],
      default: 'client',
    },
    tasks: {
      type: [TaskSchema],
      default: [],
    },
    loginDetails: {
      type: [LoginDetailSchema],
      default: [],
    },
    projects: {
      type: [ProjectSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'clientsv2' // Use a different collection name
  }
);

export default mongoose.models.ClientV2 || mongoose.model('ClientV2', ClientSchema);