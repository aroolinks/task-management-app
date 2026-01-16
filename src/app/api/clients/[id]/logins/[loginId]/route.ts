import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; loginId: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, loginId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can edit clients
    if (!user.permissions?.canEditClients) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { website, url, username, password } = body;

    if (!website || typeof website !== 'string' || website.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Website name is required' 
      }, { status: 400 });
    }

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Website URL is required' 
      }, { status: 400 });
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username is required' 
      }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password is required' 
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

    // Ensure loginDetails is an array
    if (!Array.isArray(client.loginDetails)) {
      client.loginDetails = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginIndex = client.loginDetails.findIndex((login: any) => login._id?.toString() === loginId);
    if (loginIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Login detail not found' 
      }, { status: 404 });
    }

    client.loginDetails[loginIndex].website = website.trim();
    client.loginDetails[loginIndex].url = url.trim();
    client.loginDetails[loginIndex].username = username.trim();
    client.loginDetails[loginIndex].password = password.trim();
    client.loginDetails[loginIndex].editedBy = user.username;
    client.loginDetails[loginIndex].updatedAt = new Date();

    await client.save();

    return NextResponse.json({ 
      success: true, 
      data: client.loginDetails[loginIndex] 
    });
  } catch (error) {
    console.error('Error updating login detail:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update login detail' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, loginId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can delete login details (only admins can delete)
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only administrators can delete login details' 
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

    // Ensure loginDetails is an array
    if (!Array.isArray(client.loginDetails)) {
      client.loginDetails = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginIndex = client.loginDetails.findIndex((login: any) => login._id?.toString() === loginId);
    if (loginIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Login detail not found' 
      }, { status: 404 });
    }

    client.loginDetails.splice(loginIndex, 1);
    await client.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Login detail deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting login detail:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete login detail' 
    }, { status: 500 });
  }
}