// Simple script to check what's in the database for assignments
const { MongoClient } = require('mongodb');

async function checkAssignments() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('clientsv2');
    
    console.log('🔍 Checking assignment data in database...');
    
    const clients = await collection.find({}).toArray();
    
    clients.forEach(client => {
      console.log(`\n📋 Client: ${client.name}`);
      if (Array.isArray(client.notes)) {
        client.notes.forEach((note, index) => {
          console.log(`  📝 Note ${index + 1}: ${note.title}`);
          console.log(`     assignedTo: ${note.assignedTo || 'undefined'}`);
          console.log(`     completed: ${note.completed || false}`);
          console.log(`     createdBy: ${note.createdBy || 'undefined'}`);
        });
      } else {
        console.log('  ❌ Notes is not an array:', typeof client.notes);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkAssignments();