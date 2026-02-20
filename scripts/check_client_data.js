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

async function checkClients() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const clients = await db.collection('clients').find({}).toArray();
    
    console.log('Total clients:', clients.length);
    clients.forEach(client => {
      console.log('\nClient:', client.name);
      console.log('  Tasks:', Array.isArray(client.tasks) ? client.tasks.length : 0);
      console.log('  Login Details:', Array.isArray(client.loginDetails) ? client.loginDetails.length : 0);
      
      if (client.name.toLowerCase().includes('metalogic')) {
        console.log('\n=== METALOGICS FULL DATA ===');
        console.log('Tasks array:', client.tasks);
        console.log('LoginDetails array:', client.loginDetails);
      }
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkClients();
