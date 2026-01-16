import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HostingService from '@/models/Hosting';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const hostingServices = await HostingService.find().sort({ endDate: 1 });
    
    return NextResponse.json({ 
      success: true, 
      data: hostingServices 
    });
  } catch (error) {
    console.error('Error fetching hosting services:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch hosting services' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!user.permissions?.canEditClients) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions' 
      }, { status: 403 });
    }

    const body = await request.json();
    
    await dbConnect();

    const hostingService = await HostingService.create({
      ...body,
      createdBy: user.username,
      updatedBy: user.username,
    });
    
    return NextResponse.json({ 
      success: true, 
      data: hostingService 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hosting service:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create hosting service' 
    }, { status: 500 });
  }
}
