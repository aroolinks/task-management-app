/**
 * Fix Client Tasks - Remove all tasks and let you start fresh
 * This will clear all tasks from a specific client so you can add new ones
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

async function fixClientTasks() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const clientsCollection = db.collection('clientsv2');

    // Get all clients
    const clients = await clientsCollection.find({}).toArray();
    
    console.log(`📊 Found ${clients.length} clients\n`);

    for (const client of clients) {
      console.log(`Client: ${client.name}`);
      console.log(`  Has 'tasks': ${client.tasks ? 'Yes' : 'No'}`);
      console.log(`  Has 'notes': ${client.notes ? 'Yes' : 'No'}`);
      
      if (client.tasks && Array.isArray(client.tasks)) {
        console.log(`  Tasks count: ${client.tasks.length}`);
      }
      if (client.notes && Array.isArray(client.notes)) {
        console.log(`  ⚠️  Notes count: ${client.notes.length} (should be migrated!)`);
      }
      console.log('');
    }

    console.log('\n🔧 Options:');
    console.log('1. Clear all tasks from all clients (fresh start)');
    console.log('2. Re-run migration (rename notes → tasks)');
    console.log('\nTo clear all tasks, run:');
    console.log('  node scripts/clear_all_tasks.js');
    console.log('\nTo re-run migration, run:');
    console.log('  node scripts/migrate_notes_to_tasks.js');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixClientTasks();
