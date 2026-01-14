const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('MONGODB_URI=')) {
      const value = line.substring('MONGODB_URI='.length).trim();
      MONGODB_URI = value.replace(/^["']|["']$/g, '');
      break;
    }
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function fixNoteIds() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the clients collection directly
    const db = mongoose.connection.db;
    const clientsCollection = db.collection('clientsv2');

    // Find all clients
    const clients = await clientsCollection.find({}).toArray();
    console.log(`\n📋 Found ${clients.length} clients in database`);

    let totalNotesFixed = 0;

    for (const client of clients) {
      console.log(`\n🔍 Checking client: ${client.name}`);
      
      if (!Array.isArray(client.notes) || client.notes.length === 0) {
        console.log('  ℹ️  No notes to fix');
        continue;
      }

      console.log(`  📝 Found ${client.notes.length} notes`);
      
      let needsUpdate = false;
      const updatedNotes = client.notes.map((note, index) => {
        // Check if note has an _id
        if (!note._id) {
          needsUpdate = true;
          console.log(`  ➕ Adding ID to note ${index + 1}: "${note.title}"`);
          return {
            ...note,
            _id: new mongoose.Types.ObjectId(),
            createdAt: note.createdAt || new Date(),
            updatedAt: note.updatedAt || new Date(),
          };
        }
        return note;
      });

      if (needsUpdate) {
        console.log(`  🔄 Updating client with fixed notes...`);
        await clientsCollection.updateOne(
          { _id: client._id },
          { $set: { notes: updatedNotes } }
        );
        totalNotesFixed += updatedNotes.length;
        console.log(`  ✅ Client updated successfully`);
      } else {
        console.log(`  ✅ All notes already have IDs`);
      }
    }

    // Verify the updates
    console.log('\n\n📋 Verifying all clients after update:');
    const updatedClients = await clientsCollection.find({}).toArray();
    
    for (const client of updatedClients) {
      console.log(`\n👤 ${client.name}:`);
      console.log(`  Notes: ${client.notes?.length || 0}`);
      if (client.notes && client.notes.length > 0) {
        client.notes.forEach((note, index) => {
          console.log(`    ${index + 1}. "${note.title}" - ID: ${note._id ? '✅' : '❌'}`);
        });
      }
    }

    console.log(`\n\n🎉 Fixed ${totalNotesFixed} notes across ${clients.length} clients!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixNoteIds();
