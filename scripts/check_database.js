#!/usr/bin/env node

const mongoose = require('mongoose');
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

// Load environment variables
loadEnvFile();

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');

    // Get current database name
    const currentDb = mongoose.connection.db.databaseName;
    console.log(`📂 Current database: ${currentDb}`);

    // Show collections in current database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Collections in ${currentDb}:`);
    if (collections.length === 0) {
      console.log('  (no collections found)');
    } else {
      for (const collection of collections) {
        console.log(`  - ${collection.name}`);
        
        // Get document count for each collection
        try {
          const count = await mongoose.connection.db.collection(collection.name).countDocuments();
          console.log(`    Documents: ${count}`);
          
          if (count > 0 && count <= 10) {
            const docs = await mongoose.connection.db.collection(collection.name).find({}).toArray();
            console.log(`    Sample data:`, JSON.stringify(docs, null, 2));
          }
        } catch (err) {
          console.log(`    Error getting count: ${err.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();