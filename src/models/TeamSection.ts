import mongoose from 'mongoose';

const TeamSectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  order: { type: Number, default: 0 },
}, { timestamps: true });

TeamSectionSchema.index({ order: 1 });

export default mongoose.models.TeamSection || mongoose.model('TeamSection', TeamSectionSchema);
