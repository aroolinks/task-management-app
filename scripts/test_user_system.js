const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function testUserSystem() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db();
    
    // 1. Check current users
    console.log('\n👥 Current users in database:');
    const users = await db.collection('users').find({}).toArray();
    if (users.length === 0) {
      console.log('  No users found. Creating sample users...');
      
      // Create sample users
      const sampleUsers = [
        {
          username: 'admin',
          email: 'admin@company.com',
          password: 'admin123',
          role: 'admin',
          permissions: {
            canViewTasks: true,
            canEditTasks: true,
            canViewClients: true,
            canEditClients: true,
            canManageUsers: true
          }
        },
        {
          username: 'john',
          email: 'john@company.com',
          password: 'user123',
          role: 'team_member',
          permissions: {
            canViewTasks: true,
            canEditTasks: true,
            canViewClients: true,
            canEditClients: true,
            canManageUsers: false
          }
        },
        {
          username: 'sarah',
          email: 'sarah@company.com',
          password: 'user123',
          role: 'team_member',
          permissions: {
            canViewTasks: true,
            canEditTasks: false,
            canViewClients: true,
            canEditClients: false,
            canManageUsers: false
          }
        }
      ];
      
      await db.collection('users').insertMany(sampleUsers);
      console.log('  ✅ Created sample users: admin, john, sarah');
    } else {
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
      });
    }
    
    // 2. Check tasks and their assignees
    console.log('\n📋 Tasks and their assignees:');
    const tasks = await db.collection('tasks').find({}).toArray();
    if (tasks.length === 0) {
      console.log('  No tasks found.');
    } else {
      tasks.forEach(task => {
        const assignees = task.assignees || [];
        console.log(`  - ${task.clientName}: [${assignees.join(', ')}]`);
      });
    }
    
    // 3. Verify assignees collection is empty
    console.log('\n🗑️ Checking assignees collection (should be empty):');
    const assignees = await db.collection('assignees').find({}).toArray();
    console.log(`  Found ${assignees.length} assignees (should be 0)`);
    
    console.log('\n🎉 User system test completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. Login with admin/admin123 or john/user123 or sarah/user123');
    console.log('  2. Go to Users tab to manage users');
    console.log('  3. Users will now appear in task assignment dropdowns');
    console.log('  4. All team functionality now uses the Users system');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testUserSystem().catch(console.error);