import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can view tasks
    if (!user.permissions?.canViewTasks) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    console.log('🔄 API: Attempting to connect to MongoDB...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    await dbConnect();
    console.log('✅ API: MongoDB connected successfully');
    
    // Get year parameter from URL
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    
    let query = {};
    
    // If year is specified, filter tasks by year
    if (yearParam) {
      const year = parseInt(yearParam);
      if (!isNaN(year)) {
        const startOfYear = new Date(year, 0, 1); // January 1st of the year
        const endOfYear = new Date(year + 1, 0, 1); // January 1st of next year
        
        query = {
          dueDate: {
            $gte: startOfYear,
            $lt: endOfYear
          }
        };
      }
    }
    
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    console.log('📋 API: Found', tasks.length, 'tasks', yearParam ? `for year ${yearParam}` : '');
    
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('❌ API Error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can edit tasks
    if (!user.permissions?.canEditTasks) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const task = await Task.create(body);
    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 400 }
    );
  }
}