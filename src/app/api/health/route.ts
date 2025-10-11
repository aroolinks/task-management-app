import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ 
      success: true, 
      message: 'MongoDB connection successful',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MongoDB connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}