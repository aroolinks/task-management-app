import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';

export async function GET() {
  try {
    console.log('🔄 API: Attempting to connect to MongoDB...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    await dbConnect();
    console.log('✅ API: MongoDB connected successfully');
    
    const tasks = await Task.find({}).sort({ createdAt: -1 });
    console.log('📋 API: Found', tasks.length, 'tasks');
    
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