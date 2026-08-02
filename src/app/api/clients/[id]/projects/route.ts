import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PROJECT_STATUSES = ['active', 'completed', 'on_hold'];

export async function POST(
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

    const projectStatus = PROJECT_STATUSES.includes(status) ? status : 'active';

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

    const newProject = {
      name: name.trim(),
      description: description && description.trim() ? description.trim() : undefined,
      status: projectStatus,
      createdBy: user.username,
      editedBy: user.username,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    client.projects.push(newProject);
    await client.save();

    const savedClient = await Client.findById(id);
    const createdProject = savedClient?.projects[savedClient.projects.length - 1];

    return NextResponse.json({
      success: true,
      data: createdProject
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create project'
    }, { status: 500 });
  }
}
