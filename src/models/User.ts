import mongoose from 'mongoose';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'team_member';
  permissions: {
    canViewTasks: boolean;
    canEditTasks: boolean;
    canViewClients: boolean;
    canEditClients: boolean;
    canManageUsers: boolean;
  };
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
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'team_member'],
    default: 'team_member'
  },
  permissions: {
    canViewTasks: {
      type: Boolean,
      default: false
    },
    canEditTasks: {
      type: Boolean,
      default: false
    },
    canViewClients: {
      type: Boolean,
      default: true
    },
    canEditClients: {
      type: Boolean,
      default: true
    },
    canManageUsers: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;