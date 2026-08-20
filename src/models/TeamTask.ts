import mongoose from 'mongoose';

export const TEAM_TASK_STATUSES = ['To Do', 'In Progress', 'Completed', 'On Hold'] as const;
export const TEAM_TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

const TeamTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 5000 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  priority: { type: String, enum: TEAM_TASK_PRIORITIES, default: 'Medium' },
  status: { type: String, enum: TEAM_TASK_STATUSES, default: 'To Do' },
  dueDate: { type: Date, default: null },
  notes: { type: String, default: '', maxlength: 5000 },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

TeamTaskSchema.index({ assignedTo: 1, status: 1 });
TeamTaskSchema.index({ dueDate: 1 });

export default mongoose.models.TeamTask || mongoose.model('TeamTask', TeamTaskSchema);
