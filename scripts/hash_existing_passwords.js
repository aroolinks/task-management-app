/**
 * Script to hash existing plain text passwords in the database
 * Run this once to migrate from plain text to hashed passwords
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

async function hashExistingPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users`);

    let hashedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        console.log(`⏭️  Skipping ${user.username} - password already hashed`);
        skippedCount++;
        continue;
      }

      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Update the user
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword
      });

      console.log(`✅ Hashed password for user: ${user.username}`);
      hashedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Passwords hashed: ${hashedCount}`);
    console.log(`   Already hashed (skipped): ${skippedCount}`);
    console.log('\n✅ Password migration completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

hashExistingPasswords();
