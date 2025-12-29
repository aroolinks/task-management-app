import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Assignee from '@/models/Assignee';
import Task from '@/models/Task';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all assignees from the Assignee collection
    const assignees = await Assignee.find({}).sort({ name: 1 });
    const assigneeNames = assignees.map(a => a.name);
    
    // Also get any assignees from tasks that might not be in the Assignee collection yet
    const taskAssignees = await Task.distinct('assignee', { 
      assignee: { $nin: [null, ''] } 
    });
    
    // Merge and deduplicate
    const allAssignees = Array.from(new Set([...assigneeNames, ...taskAssignees]));
    
    // Sort alphabetically
    const sortedAssignees = allAssignees.sort((a: string, b: string) => 
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    
    return NextResponse.json({ 
      success: true, 
      data: sortedAssignees 
    });
  } catch (error) {
    console.error('Error fetching assignees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignees' },
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
    
    if (trimmedName.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Name is too long' },
        { status: 400 }
      );
    }
    
    // Check if assignee already exists (case-insensitive)
    const existingAssignee = await Assignee.findOne({ 
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
    });
    
    if (existingAssignee) {
      return NextResponse.json(
        { success: false, error: 'Assignee already exists' },
        { status: 409 }
      );
    }
    
    // Create new assignee
    const assignee = new Assignee({ name: trimmedName });
    await assignee.save();
    
    return NextResponse.json({ 
      success: true, 
      data: { _id: assignee._id, name: assignee.name } 
    });
  } catch (error) {
    console.error('Error creating assignee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create assignee' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Remove from Assignee collection
    await Assignee.deleteOne({ name });
    
    // Note: We don't remove from tasks as that would unassign them from existing tasks
    // The UI should handle this by asking the user what to do with existing assignments
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete assignee' },
      { status: 500 }
    );
  }
}