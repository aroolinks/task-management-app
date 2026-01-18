import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, noteId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    const note = client.tasks[noteIndex];
    const wasCompleted = note.completed || false;
    
    // Toggle completion status
    client.tasks[noteIndex].completed = !wasCompleted;
    client.tasks[noteIndex].updatedAt = new Date();
    
    if (!wasCompleted) {
      // Mark as completed
      client.tasks[noteIndex].completedBy = user.username;
      client.tasks[noteIndex].completedAt = new Date();
    } else {
      // Mark as incomplete
      client.tasks[noteIndex].completedBy = undefined;
      client.tasks[noteIndex].completedAt = undefined;
    }

    console.log('✅ Toggling note completion:', {
      noteId,
      wasCompleted,
      nowCompleted: !wasCompleted,
      completedBy: !wasCompleted ? user.username : 'none',
      userObject: { userId: user.userId, username: user.username, role: user.role }
    });

    await client.save();

    console.log('✅ Note completion toggled, fields:', {
      completed: client.tasks[noteIndex].completed,
      completedBy: client.tasks[noteIndex].completedBy,
      completedAt: client.tasks[noteIndex].completedAt
    });

    return NextResponse.json({ 
      success: true, 
      data: client.tasks[noteIndex] 
    });
  } catch (error) {
    console.error('Error toggling note completion:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to toggle note completion' 
    }, { status: 500 });
  }
}