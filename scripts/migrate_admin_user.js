const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('MONGODB_URI=')) {
      const value = line.substring('MONGODB_URI='.length).trim();
      MONGODB_URI = value.replace(/^["']|["']$/g, '');
      break;
    }
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// User schema (matching the new model)
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

async function migrateAdminUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Check if admin user already exists with new schema
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin && existingAdmin.email && existingAdmin.role) {
      console.log('✅ Admin user already migrated with new schema');
      console.log('Admin details:', {
        username: existingAdmin.username,
        email: existingAdmin.email,
        role: existingAdmin.role,
        permissions: existingAdmin.permissions
      });
      return;
    }

    if (existingAdmin) {
      // Update existing admin user with new fields
      console.log('🔄 Updating existing admin user with new schema...');
      
      existingAdmin.email = existingAdmin.email || 'admin@metalogics.com';
      existingAdmin.role = 'admin';
      existingAdmin.permissions = {
        canViewTasks: true,
        canEditTasks: true,
        canViewClients: true,
        canEditClients: true,
        canManageUsers: true
      };

      await existingAdmin.save();
      console.log('✅ Admin user updated successfully');
    } else {
      // Create new admin user
      console.log('🔄 Creating new admin user...');
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@metalogics.com',
        password: 'password123', // In production, this should be hashed
        role: 'admin',
        permissions: {
          canViewTasks: true,
          canEditTasks: true,
          canViewClients: true,
          canEditClients: true,
          canManageUsers: true
        }
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }

    // Display final admin user details
    const finalAdmin = await User.findOne({ username: 'admin' });
    console.log('\n📋 Final admin user details:');
    console.log('Username:', finalAdmin.username);
    console.log('Email:', finalAdmin.email);
    console.log('Role:', finalAdmin.role);
    console.log('Permissions:', finalAdmin.permissions);
    console.log('\n🔑 Login credentials:');
    console.log('Username/Email: admin or admin@metalogics.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateAdminUser();