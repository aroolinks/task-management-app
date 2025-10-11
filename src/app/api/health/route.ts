import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('🎯 Health Check: Starting...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('🔑 MONGODB_URI length:', process.env.MONGODB_URI?.length || 0);
    
    await dbConnect();
    console.log('✅ Health Check: MongoDB connection successful');
    
    return NextResponse.json({ 
      success: true, 
      message: 'MongoDB connection successful',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriLength: process.env.MONGODB_URI?.length || 0
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'MongoDB connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriLength: process.env.MONGODB_URI?.length || 0
      },
      { status: 500 }
    );
  }
}
