const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement';

// Task Schema (matching the one in your models)
const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for this task.'],
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model('Task', TaskSchema);

// Dummy data
const dummyTasks = [
  {
    title: 'Complete project documentation',
    description: 'Write comprehensive documentation for the task management application',
    completed: false,
    priority: 'high',
    dueDate: new Date('2024-11-15')
  },
  {
    title: 'Review code changes',
    description: 'Review and approve pending pull requests',
    completed: true,
    priority: 'medium',
    dueDate: new Date('2024-10-20')
  },
  {
    title: 'Setup deployment pipeline',
    description: 'Configure CI/CD pipeline for automated deployment',
    completed: false,
    priority: 'low',
    dueDate: new Date('2024-12-01')
  }
];

async function testMongoDB() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 Connection string: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    
    console.log('✅ Successfully connected to MongoDB');
    
    // Clear existing tasks (optional - remove if you want to keep existing data)
    await Task.deleteMany({});
    console.log('🧹 Cleared existing tasks');
    
    // Insert dummy data
    console.log('📝 Inserting dummy tasks...');
    const insertedTasks = await Task.insertMany(dummyTasks);
    
    console.log(`✅ Successfully inserted ${insertedTasks.length} tasks:`);
    insertedTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. "${task.title}" (Priority: ${task.priority}, Completed: ${task.completed})`);
    });
    
    // Verify insertion by querying
    console.log('\n🔍 Verifying data in database...');
    const allTasks = await Task.find({});
    console.log(`📊 Total tasks in database: ${allTasks.length}`);
    
    console.log('\n📋 All tasks in database:');
    allTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task._id}`);
      console.log(`      Title: ${task.title}`);
      console.log(`      Description: ${task.description || 'No description'}`);
      console.log(`      Priority: ${task.priority}`);
      console.log(`      Completed: ${task.completed}`);
      console.log(`      Due Date: ${task.dueDate || 'No due date'}`);
      console.log(`      Created: ${task.createdAt}`);
      console.log(`      Updated: ${task.updatedAt}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testMongoDB();