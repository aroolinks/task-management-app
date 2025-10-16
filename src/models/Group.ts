import mongoose from 'mongoose';

export interface IGroup {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new mongoose.Schema<IGroup>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a group name.'],
      maxlength: [100, 'Group name cannot be more than 100 characters'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

GroupSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);