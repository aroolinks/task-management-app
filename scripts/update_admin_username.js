const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  permissions: Object
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function updateAdminUsername() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      process.exit(1);
    }

    console.log('\n📋 Current admin user:');
    console.log('  ID:', adminUser._id);
    console.log('  Username:', adminUser.username);
    console.log('  Email:', adminUser.email);
    console.log('  Role:', adminUser.role);

    // Prompt for new username
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\n✏️  Enter new username for admin (or press Enter to skip): ', async (newUsername) => {
      if (newUsername && newUsername.trim()) {
        adminUser.username = newUsername.trim();
        await adminUser.save();
        console.log('\n✅ Admin username updated to:', newUsername.trim());
        console.log('🔐 Please log out and log back in with the new username');
      } else {
        console.log('\n⏭️  Skipped username update');
      }

      readline.close();
      await mongoose.connection.close();
      console.log('\n👋 Done!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAdminUsername();
