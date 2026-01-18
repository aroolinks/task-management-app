import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all users for assignment dropdown
    const users = await User.find({}, { username: 1 }).sort({ username: 1 });
    const usernames = users.map(u => u.username);
    
    return NextResponse.json({ 
      success: true, 
      data: usernames 
    });
  } catch (error) {
    console.error('Error fetching users for assignments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    
    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 409 }
      );
    }
    
    // Create new user with basic team member permissions
    const user = new User({ 
      username: trimmedName,
      email: `${trimmedName.toLowerCase()}@company.com`, // Default email
      password: 'defaultpassword123', // Default password - should be changed
      role: 'team_member',
      permissions: {
        canViewTasks: true,
        canEditTasks: true,
        canViewClients: true,
        canEditClients: true,
        canManageUsers: false
      }
    });
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      data: { _id: user._id, name: user.username } 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    console.log('🗑️ DELETE API called');
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    console.log('👤 Attempting to delete user:', name);
    
    if (!name) {
      console.log('❌ No name provided');
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Remove user by username
    const deleteResult = await User.deleteOne({ username: name });
    console.log('🗄️ Delete result:', deleteResult);
    
    console.log('✅ Successfully deleted user');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}