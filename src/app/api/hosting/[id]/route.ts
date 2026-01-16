import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HostingService from '@/models/Hosting';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
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

    if (!user.permissions?.canEditClients) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions' 
      }, { status: 403 });
    }

    const body = await request.json();
    
    await dbConnect();

    const hostingService = await HostingService.findByIdAndUpdate(
      id,
      { ...body, updatedBy: user.username },
      { new: true, runValidators: true }
    );

    if (!hostingService) {
      return NextResponse.json({ 
        success: false, 
        error: 'Hosting service not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: hostingService 
    });
  } catch (error) {
    console.error('Error updating hosting service:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update hosting service' 
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

    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only administrators can delete hosting services' 
      }, { status: 403 });
    }

    await dbConnect();

    const hostingService = await HostingService.findByIdAndDelete(id);

    if (!hostingService) {
      return NextResponse.json({ 
        success: false, 
        error: 'Hosting service not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Hosting service deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting hosting service:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete hosting service' 
    }, { status: 500 });
  }
}
