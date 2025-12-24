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

    // Get all groups
    const groups = await mongoose.connection.db.collection('groups').find({}).toArray();
    console.log('📋 All groups:');
    groups.forEach(group => {
      console.log(`  - ${group.name} (ID: ${group._id})`);
    });

    // Look for any group containing "production" (case insensitive)
    const productionGroups = groups.filter(g => 
      g.name.toLowerCase().includes('production')
    );

    if (productionGroups.length > 0) {
      console.log('\n🗑️  Found production groups to remove:');
      for (const group of productionGroups) {
        console.log(`  Removing: ${group.name} (ID: ${group._id})`);
        await mongoose.connection.db.collection('groups').deleteOne({ _id: group._id });
        console.log(`  ✅ Removed: ${group.name}`);
      }
    } else {
      console.log('\n✅ No production groups found');
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