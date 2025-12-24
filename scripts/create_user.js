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

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function createUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define User schema
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true }
    }, { timestamps: true });

    const User = mongoose.model('User', UserSchema);

    // Clear existing users and create a new one
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create a new user with simple credentials
    const newUser = new User({
      username: 'admin',
      password: 'password123'
    });

    await newUser.save();
    console.log('User created successfully!');
    console.log('');
    console.log('=== LOGIN CREDENTIALS ===');
    console.log('Username: admin');
    console.log('Password: password123');
    console.log('========================');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createUser();