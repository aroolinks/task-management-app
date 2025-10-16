import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };

    // Try to connect to database
    let dbStatus = 'Not connected';
    let userCount = 0;
    let users = [];

    try {
      await dbConnect();
      dbStatus = 'Connected';
      
      // Count users
      userCount = await User.countDocuments();
      
      // Get user list (without passwords for security)
      users = await User.find({}, { username: 1, createdAt: 1 }).limit(5);
      
    } catch (dbError) {
      dbStatus = `Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`;
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      database: {
        status: dbStatus,
        userCount,
        users: users.map(u => ({
          username: u.username,
          id: u._id,
          created: u.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}