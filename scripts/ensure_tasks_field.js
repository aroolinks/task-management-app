/**
 * Ensure all clients have a tasks field (not notes)
 * This will fix any clients that still have notes instead of tasks
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

async function ensureTasksField() {
  try {
    console.log('🔄 Ensuring all clients have tasks field...');
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const clientsCollection = db.collection('clientsv2');

    // Find clients with notes field
    const clientsWithNotes = await clientsCollection.find({ notes: { $exists: true } }).toArray();
    console.log(`📊 Found ${clientsWithNotes.length} clients with 'notes' field`);

    if (clientsWithNotes.length > 0) {
      console.log('\n🔄 Migrating notes → tasks...');
      const result = await clientsCollection.updateMany(
        { notes: { $exists: true } },
        { $rename: { notes: 'tasks' } }
      );
      console.log(`✅ Migrated ${result.modifiedCount} clients`);
    }

    // Ensure all clients have tasks array
    const clientsWithoutTasks = await clientsCollection.find({ tasks: { $exists: false } }).toArray();
    console.log(`\n📊 Found ${clientsWithoutTasks.length} clients without 'tasks' field`);

    if (clientsWithoutTasks.length > 0) {
      console.log('🔄 Adding empty tasks array...');
      const result = await clientsCollection.updateMany(
        { tasks: { $exists: false } },
        { $set: { tasks: [] } }
      );
      console.log(`✅ Updated ${result.modifiedCount} clients`);
    }

    // Verify
    const allClients = await clientsCollection.find({}).toArray();
    console.log('\n📊 Final status:');
    allClients.forEach(client => {
      const tasksCount = client.tasks ? client.tasks.length : 0;
      const hasNotes = client.notes ? 'YES ⚠️' : 'No';
      console.log(`  ${client.name}: ${tasksCount} tasks, has notes: ${hasNotes}`);
    });

    console.log('\n✅ All clients now have tasks field!');
    console.log('\n🔄 Next steps:');
    console.log('1. Hard refresh your browser (Ctrl+Shift+R)');
    console.log('2. Try deleting a task again');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

ensureTasksField();
