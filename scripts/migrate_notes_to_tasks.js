/**
 * Migration Script: Rename 'notes' field to 'tasks' in clientsv2 collection
 * 
 * This script migrates existing client data by renaming the 'notes' field to 'tasks'
 * to match the new schema and terminology.
 * 
 * Usage: node scripts/migrate_notes_to_tasks.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
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

async function migrateNotesToTasks() {
  try {
    console.log('🔄 Starting migration: notes → tasks');
    console.log('📡 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('clientsv2');

    // Check how many documents have 'notes' field
    const docsWithNotes = await collection.countDocuments({ notes: { $exists: true } });
    console.log(`\n📊 Found ${docsWithNotes} clients with 'notes' field`);

    if (docsWithNotes === 0) {
      console.log('✅ No migration needed - all clients already use "tasks" field');
      await mongoose.connection.close();
      return;
    }

    // Show sample data before migration
    const sampleBefore = await collection.findOne({ notes: { $exists: true } });
    if (sampleBefore) {
      console.log('\n📝 Sample client BEFORE migration:');
      console.log(`   Client: ${sampleBefore.name}`);
      console.log(`   Notes count: ${sampleBefore.notes?.length || 0}`);
      console.log(`   Has tasks field: ${sampleBefore.tasks ? 'Yes' : 'No'}`);
    }

    // Perform the migration
    console.log('\n🔄 Renaming "notes" field to "tasks"...');
    const result = await collection.updateMany(
      { notes: { $exists: true } },
      { $rename: { notes: 'tasks' } }
    );

    console.log(`✅ Migration completed!`);
    console.log(`   Modified ${result.modifiedCount} documents`);

    // Verify the migration
    const docsWithTasks = await collection.countDocuments({ tasks: { $exists: true } });
    const docsStillWithNotes = await collection.countDocuments({ notes: { $exists: true } });
    
    console.log('\n📊 Verification:');
    console.log(`   Clients with "tasks" field: ${docsWithTasks}`);
    console.log(`   Clients with "notes" field: ${docsStillWithNotes}`);

    // Show sample data after migration
    const sampleAfter = await collection.findOne({ tasks: { $exists: true } });
    if (sampleAfter) {
      console.log('\n📝 Sample client AFTER migration:');
      console.log(`   Client: ${sampleAfter.name}`);
      console.log(`   Tasks count: ${sampleAfter.tasks?.length || 0}`);
      console.log(`   Has notes field: ${sampleAfter.notes ? 'Yes' : 'No'}`);
      
      if (sampleAfter.tasks && sampleAfter.tasks.length > 0) {
        console.log('\n   Sample task:');
        const task = sampleAfter.tasks[0];
        console.log(`     - Title: ${task.title}`);
        console.log(`     - Assigned to: ${task.assignedTo || 'Unassigned'}`);
        console.log(`     - Completed: ${task.completed || false}`);
      }
    }

    if (docsStillWithNotes === 0) {
      console.log('\n✅ SUCCESS: All notes have been migrated to tasks!');
    } else {
      console.log('\n⚠️  WARNING: Some documents still have "notes" field');
    }

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('\n✨ Migration complete! You can now use the new "tasks" terminology.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateNotesToTasks();
