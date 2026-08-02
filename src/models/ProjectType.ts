import mongoose from 'mongoose';

export interface IProjectType {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTypeSchema = new mongoose.Schema<IProjectType>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project type name.'],
      maxlength: [100, 'Project type name cannot be more than 100 characters'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProjectType || mongoose.model<IProjectType>('ProjectType', ProjectTypeSchema);
