export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Status = 'Completed' | 'InProcess' | 'Waiting for Quote';
export type CMS = 'Wordpress' | 'Shopify' | 'Designing' | 'SEO' | 'Marketing';
export type Assignee = 'Haroon' | 'Sameed' | 'Bilal' | 'Abubakar' | 'Awais';

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
  cms: CMS | null;
  webUrl: string;
  figmaUrl: string;
  assetUrl: string;
  totalPrice: number | null;
  deposit: number | null;
  invoiced: boolean; // New field for tracking invoice status
  assignee: string | null; // New field for task assignment (allows custom names)
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
