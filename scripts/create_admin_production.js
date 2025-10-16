const mongoose = require('mongoose');

// This script ensures the admin user exists in the production database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://metalogics_user:Metalogics%40123@cluster0.z3jbmgk.mongodb.net/taskmanagement?retryWrites=true&w=majority&appName=Cluster0';

async function ensureAdminUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define User schema
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true }
    }, { timestamps: true });

    const User = mongoose.model('User', UserSchema);

    // Check if admin user exists
    let adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('👤 Creating admin user...');
      adminUser = new User({
        username: 'admin',
        password: 'password123'
      });
      await adminUser.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
      
      // Ensure password is correct
      if (adminUser.password !== 'password123') {
        console.log('🔄 Updating password...');
        adminUser.password = 'password123';
        await adminUser.save();
        console.log('✅ Password updated');
      }
    }

    console.log('📊 Final admin user details:');
    console.log(`  Username: ${adminUser.username}`);
    console.log(`  ID: ${adminUser._id}`);
    console.log(`  Created: ${adminUser.createdAt}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

ensureAdminUser();