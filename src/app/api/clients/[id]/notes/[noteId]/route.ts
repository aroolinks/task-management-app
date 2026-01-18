import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, noteId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, assignedTo, completed } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note title is required' 
      }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note content is required' 
      }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note title cannot be more than 100 characters' 
      }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note content cannot be more than 5000 characters' 
      }, { status: 400 });
    }

    await dbConnect();

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found' 
      }, { status: 404 });
    }

    // Ensure tasks is an array
    if (!Array.isArray(client.tasks)) {
      client.tasks = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noteIndex = client.tasks.findIndex((note: any) => note._id?.toString() === noteId);
    if (noteIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note not found' 
      }, { status: 404 });
    }

    client.tasks[noteIndex].title = title.trim();
    client.tasks[noteIndex].content = content.trim();
    client.tasks[noteIndex].editedBy = user.username;
    client.tasks[noteIndex].assignedTo = assignedTo && assignedTo.trim() ? assignedTo.trim() : undefined;
    client.tasks[noteIndex].updatedAt = new Date();
    
    // Handle completion status change
    const wasCompleted = client.tasks[noteIndex].completed || false;
    const nowCompleted = completed || false;
    
    if (nowCompleted !== wasCompleted) {
      client.tasks[noteIndex].completed = nowCompleted;
      if (nowCompleted) {
        client.tasks[noteIndex].completedBy = user.username;
        client.tasks[noteIndex].completedAt = new Date();
      } else {
        client.tasks[noteIndex].completedBy = undefined;
        client.tasks[noteIndex].completedAt = undefined;
      }
    }

    await client.save();

    return NextResponse.json({ 
      success: true, 
      data: client.tasks[noteIndex] 
    });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update note' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, noteId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can delete notes (only admins can delete)
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only administrators can delete notes' 
      }, { status: 403 });
    }

    await dbConnect();

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found' 
      }, { status: 404 });
    }

    // Ensure tasks is an array
    if (!Array.isArray(client.tasks)) {
      client.tasks = [];
    }

    console.log('🗑️ DELETE: Looking for task:', {
      clientId: id,
      taskId: noteId,
      totalTasks: client.tasks.length,
      taskIds: client.tasks.map((t: { _id?: { toString: () => string } }) => t._id?.toString())
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noteIndex = client.tasks.findIndex((note: { _id?: { toString: () => string } }) => note._id?.toString() === noteId);
    
    console.log('🗑️ DELETE: Task index:', noteIndex);
    
    if (noteIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    client.tasks.splice(noteIndex, 1);
    await client.save();

    console.log('🗑️ DELETE: Task deleted successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Note deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete note' 
    }, { status: 500 });
  }
}