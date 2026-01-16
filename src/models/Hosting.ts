import mongoose from 'mongoose';

export interface IHostingService {
  _id: string;
  clientName: string;
  websiteName: string;
  websiteUrl: string;
  hostingProvider: string;
  packageType: string; // e.g., "Shared", "VPS", "Dedicated"
  cost: number;
  currency: string; // e.g., "GBP", "USD"
  billingCycle: string; // e.g., "monthly", "yearly"
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'expiring_soon';
  contactEmail: string;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HostingServiceSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    websiteName: {
      type: String,
      required: true,
    },
    websiteUrl: {
      type: String,
      required: false,
    },
    hostingProvider: {
      type: String,
      required: true,
    },
    packageType: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'GBP',
    },
    billingCycle: {
      type: String,
      required: true,
      enum: ['monthly', 'yearly', 'one-time'],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'expiring_soon'],
      default: 'active',
    },
    contactEmail: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Update status based on end date
HostingServiceSchema.pre('save', function(next) {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((this.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    this.status = 'expired';
  } else if (daysUntilExpiry <= 30) {
    this.status = 'expiring_soon';
  } else {
    this.status = 'active';
  }
  
  next();
});

export default mongoose.models.HostingService || mongoose.model('HostingService', HostingServiceSchema);
