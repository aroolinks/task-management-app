const { MongoClient } = require('mongodb');

// Load environment variables manually
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          let value = line.substring(equalIndex + 1).trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'taskmanagement';

async function addLoginDetailsField() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection('clientsv2');

    // Check if any clients exist
    const clientCount = await collection.countDocuments();
    console.log(`📊 Found ${clientCount} clients`);

    if (clientCount === 0) {
      console.log('ℹ️ No clients found, nothing to migrate');
      return;
    }

    // Update all clients that don't have loginDetails field
    const result = await collection.updateMany(
      { loginDetails: { $exists: false } },
      { $set: { loginDetails: [] } }
    );

    console.log(`✅ Updated ${result.modifiedCount} clients with loginDetails field`);

    // Verify the update
    const updatedClients = await collection.find({}).toArray();
    console.log('📋 Updated clients:');
    updatedClients.forEach(client => {
      console.log(`  - ${client.name}: ${client.loginDetails ? client.loginDetails.length : 0} login details`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

addLoginDetailsField();