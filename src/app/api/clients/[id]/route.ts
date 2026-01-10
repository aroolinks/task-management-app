import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
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
    
    return NextResponse.json({ 
      success: true, 
      data: client 
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch client' 
    }, { status: 500 });
  }
}

export async function PUT(
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
    const { name } = body;

    if (name !== undefined) {
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
    }

    await dbConnect();

    // Check if client exists
    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found' 
      }, { status: 404 });
    }

    // If name is being updated, check for duplicates
    if (name && name.trim().toLowerCase() !== existingClient.name.toLowerCase()) {
      const duplicateClient = await Client.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (duplicateClient) {
        return NextResponse.json({ 
          success: false, 
          error: 'A client with this name already exists' 
        }, { status: 409 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();

    const client = await Client.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({ 
      success: true, 
      data: client 
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update client' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const client = await Client.findByIdAndDelete(id);
    
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Client deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete client' 
    }, { status: 500 });
  }
}