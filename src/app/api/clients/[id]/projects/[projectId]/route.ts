import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; projectId: string }>;
}

const PROJECT_STATUSES = ['active', 'completed', 'on_hold'];

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, projectId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.permissions?.canEditClients) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, status } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Project name is required'
      }, { status: 400 });
    }

    if (name.length > 200) {
      return NextResponse.json({
        success: false,
        error: 'Project name cannot be more than 200 characters'
      }, { status: 400 });
    }

    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return NextResponse.json({
        success: false,
        error: 'Project description cannot be more than 2000 characters'
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

    if (!Array.isArray(client.projects)) {
      client.projects = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectIndex = client.projects.findIndex((project: any) => project._id?.toString() === projectId);
    if (projectIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    client.projects[projectIndex].name = name.trim();
    client.projects[projectIndex].description = description && description.trim() ? description.trim() : undefined;
    if (PROJECT_STATUSES.includes(status)) {
      client.projects[projectIndex].status = status;
    }
    client.projects[projectIndex].editedBy = user.username;
    client.projects[projectIndex].updatedAt = new Date();

    await client.save();

    return NextResponse.json({
      success: true,
      data: client.projects[projectIndex]
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update project'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, projectId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.permissions?.canEditClients) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    if (!Array.isArray(client.projects)) {
      client.projects = [];
    }

    const projectIndex = client.projects.findIndex(
      (project: { _id?: { toString: () => string } }) => project._id?.toString() === projectId
    );

    if (projectIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    client.projects.splice(projectIndex, 1);
    await client.save();

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete project'
    }, { status: 500 });
  }
}
