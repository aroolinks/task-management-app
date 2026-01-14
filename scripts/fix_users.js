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

async function fixUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the users collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all users
    const users = await usersCollection.find({}).toArray();
    console.log(`\n📋 Found ${users.length} users in database`);

    for (const user of users) {
      console.log(`\n🔍 Checking user: ${user.username}`);
      console.log('Current data:', {
        username: user.username,
        email: user.email,
        role: user.role,
        hasPermissions: !!user.permissions
      });

      let needsUpdate = false;
      const updates = {};

      // Check if email is missing
      if (!user.email) {
        needsUpdate = true;
        if (user.username === 'admin') {
          updates.email = 'admin@metalogics.com';
        } else if (user.username === 'teammember') {
          updates.email = 'team@metalogics.com';
        } else {
          updates.email = `${user.username}@metalogics.com`;
        }
        console.log(`  ➕ Adding email: ${updates.email}`);
      }

      // Check if role is missing
      if (!user.role) {
        needsUpdate = true;
        updates.role = user.username === 'admin' ? 'admin' : 'team_member';
        console.log(`  ➕ Adding role: ${updates.role}`);
      }

      // Check if permissions are missing
      if (!user.permissions) {
        needsUpdate = true;
        if (user.username === 'admin' || updates.role === 'admin') {
          updates.permissions = {
            canViewTasks: true,
            canEditTasks: true,
            canViewClients: true,
            canEditClients: true,
            canManageUsers: true
          };
        } else {
          updates.permissions = {
            canViewTasks: false,
            canEditTasks: false,
            canViewClients: true,
            canEditClients: true,
            canManageUsers: false
          };
        }
        console.log(`  ➕ Adding permissions:`, updates.permissions);
      }

      if (needsUpdate) {
        console.log(`  🔄 Updating user...`);
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: updates }
        );
        console.log(`  ✅ User updated successfully`);
      } else {
        console.log(`  ✅ User already has all required fields`);
      }
    }

    // Verify the updates
    console.log('\n\n📋 Verifying all users after update:');
    const updatedUsers = await usersCollection.find({}).toArray();
    
    for (const user of updatedUsers) {
      console.log(`\n👤 ${user.username}:`);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Permissions:', user.permissions);
    }

    console.log('\n\n🎉 All users have been updated successfully!');
    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin / password123');
    console.log('Team Member: teammember / password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixUsers();
