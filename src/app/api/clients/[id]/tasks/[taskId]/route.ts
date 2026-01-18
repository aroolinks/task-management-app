import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, taskId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, assignedTo, completed } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task title is required' 
      }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task content is required' 
      }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task title cannot be more than 100 characters' 
      }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task content cannot be more than 5000 characters' 
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
    const taskIndex = client.tasks.findIndex((task: any) => task._id?.toString() === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    client.tasks[taskIndex].title = title.trim();
    client.tasks[taskIndex].content = content.trim();
    client.tasks[taskIndex].editedBy = user.username;
    client.tasks[taskIndex].assignedTo = assignedTo && assignedTo.trim() ? assignedTo.trim() : undefined;
    client.tasks[taskIndex].updatedAt = new Date();
    
    // Handle completion status change
    const wasCompleted = client.tasks[taskIndex].completed || false;
    const nowCompleted = completed || false;
    
    if (nowCompleted !== wasCompleted) {
      client.tasks[taskIndex].completed = nowCompleted;
      if (nowCompleted) {
        client.tasks[taskIndex].completedBy = user.username;
        client.tasks[taskIndex].completedAt = new Date();
      } else {
        client.tasks[taskIndex].completedBy = undefined;
        client.tasks[taskIndex].completedAt = undefined;
      }
    }

    await client.save();

    return NextResponse.json({ 
      success: true, 
      data: client.tasks[taskIndex] 
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update task' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, taskId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can delete tasks (only admins can delete)
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only administrators can delete tasks' 
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskIndex = client.tasks.findIndex((task: any) => task._id?.toString() === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    client.tasks.splice(taskIndex, 1);
    await client.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete task' 
    }, { status: 500 });
  }
}
