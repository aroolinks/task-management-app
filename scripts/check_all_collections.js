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

loadEnvFile();

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:');
    collections.forEach(col => console.log('  -', col.name));
    
    // Check clients collection
    console.log('\n📦 Checking "clients" collection:');
    const clients = await db.collection('clients').find({}).toArray();
    console.log('  Count:', clients.length);
    if (clients.length > 0) {
      clients.forEach(client => {
        console.log(`\n  Client: ${client.name}`);
        console.log(`    Tasks: ${client.tasks ? client.tasks.length : 0}`);
        console.log(`    Login Details: ${client.loginDetails ? client.loginDetails.length : 0}`);
      });
    }
    
    // Check clientsv2 collection
    console.log('\n📦 Checking "clientsv2" collection:');
    const clientsv2 = await db.collection('clientsv2').find({}).toArray();
    console.log('  Count:', clientsv2.length);
    if (clientsv2.length > 0) {
      clientsv2.forEach(client => {
        console.log(`\n  Client: ${client.name}`);
        console.log(`    Tasks: ${client.tasks ? client.tasks.length : 0}`);
        console.log(`    Login Details: ${client.loginDetails ? client.loginDetails.length : 0}`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCollections();
