export type TeamTaskStatus = 'To Do' | 'In Progress' | 'Completed' | 'On Hold';
export type TeamTaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TeamMember { id: string; username: string; email: string }

export interface TeamSection { id: string; name: string; order: number }

export interface TeamTask {
  id: string;
  title: string;
  description: string;
  assignedTo: TeamMember;
  createdBy: TeamMember;
  section: string | null;
  priority: TeamTaskPriority;
  status: TeamTaskStatus;
  dueDate: string | null;
  notes: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTaskInput {
  title: string;
  description: string;
  assignedTo: string;
  section: string | null;
  priority: TeamTaskPriority;
  status: TeamTaskStatus;
  dueDate: string | null;
  notes: string;
}
