import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CompanyCredential from '@/models/CompanyCredential';
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

    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only administrators can edit company data' }, { status: 403 });
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

    const credential = await CompanyCredential.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        category: category || 'Other',
        url: (url || '').trim(),
        username: username.trim(),
        password: password.trim(),
        notes: (notes || '').trim(),
        editedBy: user.username,
      },
      { new: true, runValidators: true }
    );

    if (!credential) {
      return NextResponse.json({ success: false, error: 'Company credential not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: credential
    });
  } catch (error) {
    console.error('Error updating company credential:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update company credential'
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
      return NextResponse.json({ success: false, error: 'Only administrators can delete company data' }, { status: 403 });
    }

    await dbConnect();

    const credential = await CompanyCredential.findByIdAndDelete(id);

    if (!credential) {
      return NextResponse.json({ success: false, error: 'Company credential not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Company credential deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company credential:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete company credential'
    }, { status: 500 });
  }
}
