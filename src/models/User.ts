import mongoose from 'mongoose';

export interface IUser {
  _id: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;