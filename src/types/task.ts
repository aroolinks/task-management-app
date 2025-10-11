export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Status = 'Completed' | 'InProcess' | 'Waiting for Quote' | 'Designing';
export type CMS = 'Wordpress' | 'Shopify' | 'Jov Des' | 'Designing' | 'SEO' | 'Marketing';

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
  cms: CMS | null;
  webUrl: string;
  figmaUrl: string;
  assetUrl: string;
  totalPrice: number | null;
  deposit: number | null;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
