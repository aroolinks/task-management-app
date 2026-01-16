const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          let value = line.substring(equalIndex + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkTeamMember() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('taskmanagement');
    const user = await db.collection('users').findOne({ username: 'teammember' });
    
    if (user) {
      console.log('👤 Team Member User Found:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Username:', user.username);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('\n📋 Permissions:');
      console.log('  canViewTasks:', user.permissions?.canViewTasks || false);
      console.log('  canEditTasks:', user.permissions?.canEditTasks || false);
      console.log('  canViewClients:', user.permissions?.canViewClients || false);
      console.log('  canEditClients:', user.permissions?.canEditClients || false);
      console.log('  canManageUsers:', user.permissions?.canManageUsers || false);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      if (!user.permissions?.canViewClients) {
        console.log('⚠️  WARNING: canViewClients is FALSE!');
        console.log('   Team member cannot see Hosting tab.\n');
        console.log('🔧 Fixing permissions...\n');
        
        await db.collection('users').updateOne(
          { username: 'teammember' },
          { 
            $set: { 
              'permissions.canViewClients': true,
              'permissions.canEditClients': true
            } 
          }
        );
        
        console.log('✅ Permissions updated!');
        console.log('   canViewClients: true');
        console.log('   canEditClients: true\n');
        console.log('🔄 Please log out and log back in to see changes.');
      } else {
        console.log('✅ Permissions are correct!');
        console.log('   Team member should be able to see Hosting tab.');
      }
    } else {
      console.log('❌ Team member user not found!');
      console.log('   Username: teammember');
      console.log('   Password: password123');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkTeamMember();
