import { Task } from '@/types/task';

export interface InvoiceData {
  tasks: Task[];
  groupName?: string;
  clientName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
}

export const generateInvoiceText = (data: InvoiceData) => {
  generateTextInvoice(data);
  return 'invoice.txt';
};

// Fallback text invoice generation
const generateTextInvoice = (data: InvoiceData) => {
  const {
    tasks,
    groupName = 'All Groups',
    invoiceNumber = `INV-${Date.now()}`,
    invoiceDate = new Date().toLocaleDateString()
  } = data;
  
  const completedTasks = tasks.filter(task => task.status === 'Completed');
  const totalAmount = completedTasks.reduce((sum, task) => sum + (task.totalPrice || 0), 0);
  const totalDeposits = completedTasks.reduce((sum, task) => sum + (task.deposit || 0), 0);
  const balanceDue = totalAmount - totalDeposits;
  
  let invoiceText = `INVOICE\n\n`;
  invoiceText += `Invoice Number: ${invoiceNumber}\n`;
  invoiceText += `Date: ${invoiceDate}\n`;
  invoiceText += `Client Group: ${groupName}\n\n`;
  invoiceText += `COMPLETED PROJECTS:\n`;
  invoiceText += `${'#'.padEnd(3)} ${'Project Name'.padEnd(30)} ${'Service'.padEnd(15)} ${'Amount'.padStart(10)}\n`;
  invoiceText += `${'-'.repeat(60)}\n`;
  
  completedTasks.forEach((task, index) => {
    invoiceText += `${String(index + 1).padEnd(3)} ${(task.clientName || 'N/A').padEnd(30)} ${(task.cms || 'N/A').padEnd(15)} ${('£' + (task.totalPrice?.toFixed(2) || '0.00')).padStart(10)}\n`;
  });
  
  invoiceText += `\n${''.padEnd(48)}${'-'.repeat(12)}\n`;
  invoiceText += `${'Subtotal:'.padEnd(48)}£${totalAmount.toFixed(2).padStart(9)}\n`;
  invoiceText += `${'Deposits:'.padEnd(48)}-£${totalDeposits.toFixed(2).padStart(8)}\n`;
  invoiceText += `${''.padEnd(48)}${'-'.repeat(12)}\n`;
  invoiceText += `${'BALANCE DUE:'.padEnd(48)}£${balanceDue.toFixed(2).padStart(9)}\n`;
  
  // Create and download text file
  const blob = new Blob([invoiceText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${groupName.toLowerCase().replace(/\s+/g, '-')}-${invoiceDate.replace(/\//g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateGroupInvoice = (tasks: Task[], groupName: string) => {
  const groupTasks = tasks.filter(task => 
    (task.clientGroup || 'Ungrouped') === groupName
  );
  
  return generateInvoiceText({
    tasks: groupTasks,
    groupName,
    clientName: groupName
  });
};

export const generateAllTasksInvoice = (tasks: Task[]) => {
  return generateInvoiceText({
    tasks,
    groupName: 'All Projects',
    clientName: 'All Clients'
  });
};
