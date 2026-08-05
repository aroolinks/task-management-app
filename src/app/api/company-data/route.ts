import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CompanyCredential from '@/models/CompanyCredential';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only administrators can view company data' }, { status: 403 });
    }

    await dbConnect();

    const credentials = await CompanyCredential.find().sort({ title: 1 });

    return NextResponse.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('Error fetching company credentials:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch company credentials'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only administrators can add company data' }, { status: 403 });
    }

    const body = await request.json();
    const { title, category, url, username, password, notes } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    await dbConnect();

    const credential = await CompanyCredential.create({
      title: title.trim(),
      category: category || 'Other',
      url: (url || '').trim(),
      username: username.trim(),
      password: password.trim(),
      notes: (notes || '').trim(),
      createdBy: user.username,
      editedBy: user.username,
    });

    return NextResponse.json({
      success: true,
      data: credential
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company credential:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create company credential'
    }, { status: 500 });
  }
}
