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

    // Find tasks with Production in the name
    const productionTasks = await mongoose.connection.db.collection('tasks').find({
      $or: [
        { clientName: /production/i },
        { clientGroup: /production/i },
        { clientGroup: /prod/i }
      ]
    }).toArray();

    console.log(`📋 Found ${productionTasks.length} production-related tasks:`);
    productionTasks.forEach(task => {
      console.log(`  - ${task.clientName} (Group: ${task.clientGroup}) - ID: ${task._id}`);
    });

    if (productionTasks.length > 0) {
      console.log('\n🗑️  Removing production tasks...');
      const result = await mongoose.connection.db.collection('tasks').deleteMany({
        $or: [
          { clientName: /production/i },
          { clientGroup: /production/i },
          { clientGroup: /prod/i }
        ]
      });
      console.log(`✅ Removed ${result.deletedCount} production tasks`);
    } else {
      console.log('\n✅ No production tasks found');
    }

    // Also remove any groups with "prod" in the name
    const prodGroups = await mongoose.connection.db.collection('groups').find({
      name: /prod/i
    }).toArray();

    console.log(`\n📋 Found ${prodGroups.length} production-related groups:`);
    prodGroups.forEach(group => {
      console.log(`  - ${group.name} - ID: ${group._id}`);
    });

    if (prodGroups.length > 0) {
      console.log('\n🗑️  Removing production groups...');
      const result = await mongoose.connection.db.collection('groups').deleteMany({
        name: /prod/i
      });
      console.log(`✅ Removed ${result.deletedCount} production groups`);
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