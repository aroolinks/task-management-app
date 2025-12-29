import mongoose from 'mongoose';

const assigneeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
assigneeSchema.index({ name: 1 });

const Assignee = mongoose.models.Assignee || mongoose.model('Assignee', assigneeSchema);

export default Assignee;