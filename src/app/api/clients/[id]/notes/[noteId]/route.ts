import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params;
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

    const client = await Client.findById(params.id);
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

    const noteIndex = client.notes.findIndex((note: any) => note._id?.toString() === params.noteId);
    if (noteIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note not found' 
      }, { status: 404 });
    }

    client.notes[noteIndex].title = title.trim();
    client.notes[noteIndex].content = content.trim();
    client.notes[noteIndex].updatedAt = new Date();

    await client.save();

    return NextResponse.json({ 
      success: true, 
      data: client.notes[noteIndex] 
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
  { params }: { params: Promise<{ id: string; noteId: string }> }
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

    const noteIndex = client.notes.findIndex((note: any) => note._id?.toString() === noteId);
    if (noteIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Note not found' 
      }, { status: 404 });
    }

    client.notes.splice(noteIndex, 1);
    await client.save();

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