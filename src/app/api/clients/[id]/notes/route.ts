import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, assignedTo, completed } = body;

    console.log('API: Creating note:', { title, assignedTo, completed, user: user.username });

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

    const newTask = {
      title: title.trim(),
      content: content.trim(),
      createdBy: user.username,
      editedBy: user.username,
      assignedTo: assignedTo && assignedTo.trim() ? assignedTo.trim() : undefined,
      completed: completed || false,
      completedBy: completed ? user.username : undefined,
      completedAt: completed ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('API: Saving note to database:', { assignedTo: newTask.assignedTo });

    client.tasks.push(newTask);
    await client.save();

    // Get the newly created note with its ID
    const savedClient = await Client.findById(id);
    const createdNote = savedClient?.tasks[savedClient.tasks.length - 1];
    
    console.log('API: Note saved:', { 
      noteId: createdNote?._id, 
      assignedTo: (createdNote as { assignedTo?: string })?. assignedTo 
    });
    
    return NextResponse.json({ 
      success: true, 
      data: createdNote 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create note' 
    }, { status: 500 });
  }
}