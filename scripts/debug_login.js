const mongoose = require('mongoose');

// Load environment variables
const fs = require('fs');
const path = require('path');

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
const JWT_SECRET = process.env.JWT_SECRET;

console.log('Environment check:');
console.log('MONGODB_URI exists:', !!MONGODB_URI);
console.log('JWT_SECRET exists:', !!JWT_SECRET);
console.log('JWT_SECRET value:', JWT_SECRET);

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function debugLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Define User schema
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true }
    }, { timestamps: true });

    const User = mongoose.model('User', UserSchema);

    // Check if user exists
    console.log('\n=== Checking for existing users ===');
    const users = await User.find({});
    console.log('Found users:', users.length);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Username: "${user.username}"`);
      console.log(`  Password: "${user.password}"`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('');
    });

    // Try to find the specific user
    console.log('=== Testing login credentials ===');
    const testUser = await User.findOne({ username: 'admin' });
    
    if (!testUser) {
      console.log('❌ User "admin" not found');
      
      // Create the user
      console.log('Creating admin user...');
      const newUser = new User({
        username: 'admin',
        password: 'password123'
      });
      
      await newUser.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ User "admin" found');
      console.log(`Username: "${testUser.username}"`);
      console.log(`Password: "${testUser.password}"`);
      
      // Test password comparison
      const passwordMatch = testUser.password === 'password123';
      console.log(`Password match test: ${passwordMatch ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!passwordMatch) {
        console.log('Updating password to "password123"...');
        testUser.password = 'password123';
        await testUser.save();
        console.log('✅ Password updated');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugLogin();