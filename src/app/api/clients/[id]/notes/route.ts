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
    const { title, content } = body;

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

    // Ensure notes is an array (handle migration from old string format)
    if (!Array.isArray(client.notes)) {
      const oldNotes = typeof client.notes === 'string' && client.notes.trim() ? client.notes.trim() : '';
      client.notes = oldNotes ? [{
        title: 'Migrated Notes',
        content: oldNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
      }] : [];
    }

    const newNote = {
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    client.notes.push(newNote);
    await client.save();

    // Get the newly created note with its ID
    const savedClient = await Client.findById(id);
    const createdNote = savedClient?.notes[savedClient.notes.length - 1];
    
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