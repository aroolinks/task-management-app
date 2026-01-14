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

async function createTeamMember() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Check if team member already exists
    const existingUser = await User.findOne({ username: 'teammember' });
    
    if (existingUser) {
      console.log('✅ Team member already exists');
      console.log('Team member details:', {
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
        permissions: existingUser.permissions
      });
      return;
    }

    // Create new team member user
    console.log('🔄 Creating new team member user...');
    
    const teamMember = new User({
      username: 'teammember',
      email: 'team@metalogics.com',
      password: 'password123', // In production, this should be hashed
      role: 'team_member',
      permissions: {
        canViewTasks: false,
        canEditTasks: false,
        canViewClients: true,
        canEditClients: true,
        canManageUsers: false
      }
    });

    await teamMember.save();
    console.log('✅ Team member user created successfully');

    // Display final team member details
    const finalUser = await User.findOne({ username: 'teammember' });
    console.log('\n📋 Team member details:');
    console.log('Username:', finalUser.username);
    console.log('Email:', finalUser.email);
    console.log('Role:', finalUser.role);
    console.log('Permissions:', finalUser.permissions);
    console.log('\n🔑 Login credentials:');
    console.log('Username/Email: teammember or team@metalogics.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Creation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the creation
createTeamMember();