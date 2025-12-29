const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';

async function migrateAssignees() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const tasksCollection = db.collection('tasks');
    const assigneesCollection = db.collection('assignees');
    
    // Get all unique assignees from tasks
    const taskAssignees = await tasksCollection.distinct('assignee', { 
      assignee: { $nin: [null, ''] } 
    });
    
    console.log(`Found ${taskAssignees.length} unique assignees in tasks:`, taskAssignees);
    
    // Get existing assignees from the assignees collection
    const existingAssignees = await assigneesCollection.find({}).toArray();
    const existingNames = existingAssignees.map(a => a.name);
    
    console.log(`Found ${existingNames.length} existing assignees in collection:`, existingNames);
    
    // Find assignees that need to be added
    const newAssignees = taskAssignees.filter(name => 
      !existingNames.some(existing => existing.toLowerCase() === name.toLowerCase())
    );
    
    if (newAssignees.length > 0) {
      console.log(`Adding ${newAssignees.length} new assignees:`, newAssignees);
      
      const assigneeDocs = newAssignees.map(name => ({
        name,
        createdAt: new Date()
      }));
      
      await assigneesCollection.insertMany(assigneeDocs);
      console.log('Successfully added new assignees');
    } else {
      console.log('No new assignees to add');
    }
    
    // Also add default assignees if they don't exist
    const defaultAssignees = ['Haroon', 'Sameed', 'Bilal', 'Abubakar', 'Awais'];
    const allExistingNames = [...existingNames, ...newAssignees];
    
    const missingDefaults = defaultAssignees.filter(name => 
      !allExistingNames.some(existing => existing.toLowerCase() === name.toLowerCase())
    );
    
    if (missingDefaults.length > 0) {
      console.log(`Adding ${missingDefaults.length} missing default assignees:`, missingDefaults);
      
      const defaultDocs = missingDefaults.map(name => ({
        name,
        createdAt: new Date()
      }));
      
      await assigneesCollection.insertMany(defaultDocs);
      console.log('Successfully added default assignees');
    }
    
    // Final count
    const finalCount = await assigneesCollection.countDocuments();
    console.log(`Migration complete. Total assignees in collection: ${finalCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrateAssignees();