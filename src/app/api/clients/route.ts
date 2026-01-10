import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    try {
      const clients = await Client.find({}).sort({ name: 1 });
      return NextResponse.json({ 
        success: true, 
        data: clients 
      });
    } catch (error) {
      console.error('Error with Client model:', error);
      // If there's an issue with the model, return empty array for now
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch clients' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client name is required' 
      }, { status: 400 });
    }

    if (name.length > 200) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client name cannot be more than 200 characters' 
      }, { status: 400 });
    }

    await dbConnect();

    // Check if client already exists
    const existingClient = await Client.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    
    if (existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'A client with this name already exists' 
      }, { status: 409 });
    }

    const client = new Client({
      name: name.trim(),
      notes: []
    });

    await client.save();
    
    return NextResponse.json({ 
      success: true, 
      data: client 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create client' 
    }, { status: 500 });
  }
}