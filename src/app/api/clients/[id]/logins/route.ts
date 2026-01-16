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

    if (website.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Website name cannot be more than 100 characters' 
      }, { status: 400 });
    }

    if (url.length > 500) {
      return NextResponse.json({ 
        success: false, 
        error: 'URL cannot be more than 500 characters' 
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

    const newLoginDetail = {
      website: website.trim(),
      url: url.trim(),
      username: username.trim(),
      password: password.trim(),
      createdBy: user.username,
      editedBy: user.username,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    client.loginDetails.push(newLoginDetail);
    const savedClient = await client.save();

    // Get the newly created login detail with its ID
    const createdLoginDetail = savedClient.loginDetails && savedClient.loginDetails.length > 0 
      ? savedClient.loginDetails[savedClient.loginDetails.length - 1] 
      : newLoginDetail;
    
    return NextResponse.json({ 
      success: true, 
      data: createdLoginDetail 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating login detail:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create login detail' 
    }, { status: 500 });
  }
}