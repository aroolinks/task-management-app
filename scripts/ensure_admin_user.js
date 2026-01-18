/**
 * Ensure admin user exists
 * This script checks if the admin user exists and creates it if not
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

async function ensureAdminUser() {
  try {
    console.log('🔄 Checking admin user...');
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check if admin exists
    const adminUser = await usersCollection.findOne({ username: 'admin' });

    if (adminUser) {
      console.log('✅ Admin user already exists:');
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Email: ${adminUser.email || 'N/A'}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Password: ${adminUser.password ? 'Set' : 'NOT SET'}`);
      
      // Verify password
      if (adminUser.password === 'admin123') {
        console.log('\n✅ Admin password is correct (admin123)');
      } else {
        console.log('\n⚠️  Admin password might be different');
        console.log('   Updating to: admin123');
        await usersCollection.updateOne(
          { username: 'admin' },
          { $set: { password: 'admin123' } }
        );
        console.log('✅ Password updated');
      }
    } else {
      console.log('⚠️  Admin user not found. Creating...');
      
      const newAdmin = {
        username: 'admin',
        email: 'admin@metalogics.com',
        password: 'admin123',
        role: 'admin',
        permissions: {
          canEditClients: true,
          canDeleteClients: true,
          canManageUsers: true,
          canViewReports: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await usersCollection.insertOne(newAdmin);
      console.log('✅ Admin user created successfully!');
      console.log(`   Username: admin`);
      console.log(`   Password: admin123`);
      console.log(`   Email: admin@metalogics.com`);
    }

    console.log('\n📝 You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

ensureAdminUser();
