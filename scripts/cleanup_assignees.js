const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function cleanupAssignees() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db();
    
    // 1. Remove all documents from assignees collection
    console.log('🗑️ Removing all assignees...');
    const assigneesResult = await db.collection('assignees').deleteMany({});
    console.log(`✅ Deleted ${assigneesResult.deletedCount} assignees`);
    
    // 2. Clear assignees array from all tasks
    console.log('🗑️ Clearing assignees from all tasks...');
    const tasksResult = await db.collection('tasks').updateMany(
      {},
      { $set: { assignees: [] } }
    );
    console.log(`✅ Updated ${tasksResult.modifiedCount} tasks`);
    
    // 3. Show current users (these will be the new team members)
    console.log('👥 Current users in database:');
    const users = await db.collection('users').find({}, { projection: { username: 1, email: 1, role: 1 } }).toArray();
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });
    
    console.log('🎉 Cleanup completed successfully!');
    console.log('📝 Next steps:');
    console.log('  1. Update code to use users instead of assignees');
    console.log('  2. Tasks will now be assigned to actual user accounts');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupAssignees().catch(console.error);