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

async function checkMetalogics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const metalogics = await db.collection('clientsv2').findOne({ name: 'Metalogics' });
    
    if (metalogics) {
      console.log('✅ Found Metalogics!');
      console.log('\nTasks array:', JSON.stringify(metalogics.tasks, null, 2));
      console.log('\nLoginDetails array:', JSON.stringify(metalogics.loginDetails, null, 2));
      console.log('\nTotal tasks:', metalogics.tasks ? metalogics.tasks.length : 0);
      console.log('Total login details:', metalogics.loginDetails ? metalogics.loginDetails.length : 0);
    } else {
      console.log('❌ Metalogics not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMetalogics();
