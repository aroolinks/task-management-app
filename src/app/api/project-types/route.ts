import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProjectType from '@/models/ProjectType';

const DEFAULT_PROJECT_TYPES = ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'];

export async function GET() {
  try {
    await dbConnect();

    let projectTypes = await ProjectType.find({}).sort({ name: 1 });

    // Seed sensible defaults the first time this collection is queried, so
    // existing tasks created against the old hardcoded list keep working.
    // Upsert per-name (rather than insertMany) so concurrent requests racing
    // an empty collection can't each insert their own full set of defaults.
    if (projectTypes.length === 0) {
      await Promise.all(
        DEFAULT_PROJECT_TYPES.map(name =>
          ProjectType.findOneAndUpdate(
            { name },
            { $setOnInsert: { name } },
            { upsert: true }
          ).catch(() => null)
        )
      );
      projectTypes = await ProjectType.find({}).sort({ name: 1 });
    }

    return NextResponse.json({ success: true, data: projectTypes });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const rawName: unknown = body?.name;
    if (typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid project type name' },
        { status: 400 }
      );
    }
    const name = rawName.trim();

    const exists = await ProjectType.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Project type already exists' },
        { status: 409 }
      );
    }

    const projectType = await ProjectType.create({ name });
    return NextResponse.json({ success: true, data: projectType }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create project type' },
      { status: 400 }
    );
  }
}
