/**
 * Quick script to reset your own password
 * Usage: node scripts/reset_my_password.js <username> <new-password>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  permissions: Object
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function resetPassword() {
  const username = process.argv[2];
  const newPassword = process.argv[3];

  if (!username || !newPassword) {
    console.error('❌ Usage: node scripts/reset_my_password.js <username> <new-password>');
    console.log('\nAvailable users:');
    console.log('  - Sameed Afzal');
    console.log('  - Haroon');
    console.log('  - Bilal');
    console.log('  - abubakar');
    console.log('\nExample: node scripts/reset_my_password.js Haroon myNewPassword123');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the user
    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`❌ User "${username}" not found`);
      console.log('\nAvailable users:');
      const users = await User.find({}, { username: 1 });
      users.forEach(u => console.log(`  - ${u.username}`));
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password reset successfully for: ${username}`);
    console.log(`\n📝 Login credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n🔗 Login at: http://localhost:3000`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

resetPassword();
