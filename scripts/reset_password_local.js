const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile();

const MONGODB_URI = process.env.MONGODB_URI;

async function resetPassword() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    
    console.log('📋 Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email || 'no email'})`);
    });

    // Reset password for Sameed Afzal (first user) to a simple password
    const username = 'Sameed Afzal';
    const newPassword = 'password123';
    
    console.log(`\n🔄 Resetting password for: ${username}`);
    console.log(`   New password: ${newPassword}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user
    const result = await usersCollection.updateOne(
      { username: username },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successfully!\n');
      console.log('🔑 Login credentials:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ Failed to reset password');
    }

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
