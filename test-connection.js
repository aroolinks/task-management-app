const { MongoClient } = require('mongodb');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Testing MongoDB Connection...');
console.log('📍 URI (masked):', MONGODB_URI ? `${MONGODB_URI.split('@')[0].split('://')[0]}://***@${MONGODB_URI.split('@')[1]}` : 'NOT SET');

async function testConnection() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI, { 
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test database operations
    const db = client.db();
    console.log(`📊 Database: ${db.databaseName}`);
    
    const collection = db.collection('tasks');
    const count = await collection.countDocuments();
    console.log(`📋 Tasks count: ${count}`);
    
    // Test a simple query
    const tasks = await collection.find({}).limit(3).toArray();
    console.log(`📝 Sample tasks: ${tasks.length}`);
    
    if (tasks.length > 0) {
      console.log('📄 First task keys:', Object.keys(tasks[0]));
    }
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    // Common error scenarios
    if (error.message.includes('authentication failed')) {
      console.error('💡 Suggestion: Check your username and password');
    } else if (error.message.includes('network')) {
      console.error('💡 Suggestion: Check your internet connection and firewall');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Suggestion: Check if your IP is whitelisted in MongoDB Atlas');
    }
    
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();