import mongoose from 'mongoose';

export interface ITask {
  _id: string;
  clientName: string;
  clientGroup: string;
  completed: boolean;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Completed' | 'InProcess' | 'Waiting for Quote';
  cms: 'Wordpress' | 'Shopify' | 'Designing' | 'SEO' | 'Marketing' | null;
  webUrl?: string;
  figmaUrl?: string;
  assetUrl?: string;
  totalPrice?: number | null;
  deposit?: number | null;
  dueDate?: Date | null;
  invoiced: boolean;
  paid: boolean;
  assignees?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new mongoose.Schema<ITask>(
  {
    clientName: {
      type: String,
      required: [true, 'Please provide a client name for this task.'],
      maxlength: [200, 'Client name cannot be more than 200 characters'],
    },
    clientGroup: {
      type: String,
      required: [true, 'Please provide a client group for this task.'],
      maxlength: [100, 'Client group cannot be more than 100 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Low',
    },
    status: {
      type: String,
      enum: ['Completed', 'InProcess', 'Waiting for Quote'],
      default: 'Waiting for Quote',
    },
    cms: {
      type: String,
      enum: ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'],
      default: null,
    },
    webUrl: {
      type: String,
      default: '',
    },
    figmaUrl: {
      type: String,
      default: '',
    },
    assetUrl: {
      type: String,
      default: '',
    },
    totalPrice: {
      type: Number,
      default: null,
    },
    deposit: {
      type: Number,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    invoiced: {
      type: Boolean,
      default: false,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    assignees: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
