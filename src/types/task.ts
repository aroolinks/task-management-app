export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Status = 'Completed' | 'InProcess' | 'Waiting for Quote';

export interface Task {
  id: string;
  dueDate: Date | null;
  priority: Priority;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  // New fields
  status: Status;
  clientName: string;
  clientGroup: string; // New field for grouping projects by client sections
  cms: string | null; // Project type, managed dynamically via ProjectTypeContext
  webUrl: string;
  figmaUrl: string;
  assetUrl: string;
  totalPrice: number | null;
  deposit: number | null;
  invoiced: boolean; // New field for tracking invoice status
  paid: boolean; // New field for tracking payment status
  assignees: string[]; // Support multiple team members per task (usernames)
  notes: string; // New field for client notes, logins, passwords, etc.
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
