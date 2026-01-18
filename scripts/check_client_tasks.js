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

async function checkClientTasks() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const clientsCollection = db.collection('clientsv2');

    // Find the specific client
    const clientId = '6966429c887b9da4e8ef53c4';
    const client = await clientsCollection.findOne({ _id: new mongoose.Types.ObjectId(clientId) });

    if (!client) {
      console.log('❌ Client not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`📊 Client: ${client.name}`);
    console.log(`   Has 'tasks' field: ${client.tasks ? 'Yes' : 'No'}`);
    console.log(`   Has 'notes' field: ${client.notes ? 'Yes' : 'No'}`);
    
    if (client.tasks && Array.isArray(client.tasks)) {
      console.log(`\n   Tasks (${client.tasks.length}):`);
      client.tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ID: ${task._id}`);
        console.log(`      Title: ${task.title}`);
        console.log(`      Assigned: ${task.assignedTo || 'Unassigned'}`);
        console.log('');
      });
    } else {
      console.log('\n   ⚠️  No tasks array found!');
    }

    if (client.notes && Array.isArray(client.notes)) {
      console.log(`\n   ⚠️  Still has 'notes' field with ${client.notes.length} items!`);
      console.log('   This should have been migrated to tasks.');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkClientTasks();
