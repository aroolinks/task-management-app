#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

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

    // List all databases
    const admin = mongoose.connection.db.admin();
    const dbList = await admin.listDatabases();
    console.log('📋 Available databases:');
    dbList.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check if there's a test database and remove it
    const testDb = dbList.databases.find(db => db.name === 'test' || db.name.includes('test'));
    if (testDb) {
      console.log(`🗑️  Found test database: ${testDb.name}`);
      console.log('⚠️  Removing test database...');
      await mongoose.connection.db.admin().command({ dropDatabase: 1 }, { dbName: testDb.name });
      console.log('✅ Test database removed');
    } else {
      console.log('ℹ️  No test database found');
    }

    // Show collections in current database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Collections in ${currentDb}:`);
    if (collections.length === 0) {
      console.log('  (no collections found)');
    } else {
      collections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });
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