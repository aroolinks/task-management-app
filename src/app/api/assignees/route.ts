import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all unique assignees from tasks, excluding null/empty values
    const assignees = await Task.distinct('assignee', { 
      assignee: { $nin: [null, ''] } 
    });
    
    // Sort alphabetically
    const sortedAssignees = assignees.sort((a: string, b: string) => 
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    
    return NextResponse.json({ 
      success: true, 
      data: sortedAssignees 
    });
  } catch (error) {
    console.error('Error fetching assignees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignees' },
      { status: 500 }
    );
  }
}