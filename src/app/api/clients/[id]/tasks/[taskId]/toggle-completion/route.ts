import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, taskId } = await params;
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
    const taskIndex = client.tasks.findIndex((task: any) => task._id?.toString() === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    const task = client.tasks[taskIndex];
    const wasCompleted = task.completed || false;
    
    // Toggle completion status
    client.tasks[taskIndex].completed = !wasCompleted;
    client.tasks[taskIndex].updatedAt = new Date();
    
    if (!wasCompleted) {
      // Mark as completed
      client.tasks[taskIndex].completedBy = user.username;
      client.tasks[taskIndex].completedAt = new Date();
    } else {
      // Mark as incomplete
      client.tasks[taskIndex].completedBy = undefined;
      client.tasks[taskIndex].completedAt = undefined;
    }

    console.log('✅ Toggling task completion:', {
      taskId,
      wasCompleted,
      nowCompleted: !wasCompleted,
      completedBy: !wasCompleted ? user.username : 'none',
      userObject: { userId: user.userId, username: user.username, role: user.role }
    });

    await client.save();

    console.log('✅ Task completion toggled, fields:', {
      completed: client.tasks[taskIndex].completed,
      completedBy: client.tasks[taskIndex].completedBy,
      completedAt: client.tasks[taskIndex].completedAt
    });

    return NextResponse.json({ 
      success: true, 
      data: client.tasks[taskIndex] 
    });
  } catch (error) {
    console.error('Error toggling task completion:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to toggle task completion' 
    }, { status: 500 });
  }
}
