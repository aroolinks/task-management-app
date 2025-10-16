const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if users collection exists and get all users
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const userCollection = collections.find(col => col.name === 'users');

    if (!userCollection) {
      console.log('No users collection found. Creating a default user...');
      
      // Create a default user
      const User = mongoose.model('User', new mongoose.Schema({
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true }
      }, { timestamps: true }));

      const defaultUser = new User({
        username: 'admin',
        password: 'admin123'
      });

      await defaultUser.save();
      console.log('Default user created:');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      // Get all users
      const users = await db.collection('users').find({}).toArray();
      console.log(`Found ${users.length} user(s):`);
      
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Password: ${user.password}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log('');
      });

      if (users.length === 0) {
        console.log('Users collection exists but is empty. Creating a default user...');
        
        const User = mongoose.model('User', new mongoose.Schema({
          username: { type: String, required: true, unique: true },
          password: { type: String, required: true }
        }, { timestamps: true }));

        const defaultUser = new User({
          username: 'admin',
          password: 'admin123'
        });

        await defaultUser.save();
        console.log('Default user created:');
        console.log('Username: admin');
        console.log('Password: admin123');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkUsers();