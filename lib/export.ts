import * as XLSX from 'xlsx';
import type { Order } from '@/types';
import { formatDate } from './utils';

export function exportOrdersToExcel(orders: Order[], filename: string = 'production-sheet.xlsx'): void {
  // Prepare data for export
  const data = orders.map(order => ({
    'Order Number': order.order_number,
    'Platform': order.platform.toUpperCase(),
    'Customer': order.customer_name || 'N/A',
    'Email': order.customer_email || 'N/A',
    'Quantity': order.quantity,
    'Decoration': order.decoration_method.replace('_', ' ').toUpperCase(),
    'Due Date': formatDate(order.due_date),
    'Status': order.status.toUpperCase(),
    'Priority': order.priority ? 'YES' : 'NO',
    'Notes': order.notes || '',
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Order Number
    { wch: 15 }, // Platform
    { wch: 20 }, // Customer
    { wch: 25 }, // Email
    { wch: 10 }, // Quantity
    { wch: 15 }, // Decoration
    { wch: 12 }, // Due Date
    { wch: 12 }, // Status
    { wch: 8 },  // Priority
    { wch: 30 }, // Notes
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Production Sheet');

  // Download file
  XLSX.writeFile(workbook, filename);
}

export function exportProductionSheetByStation(orders: Order[]): void {
  const workbook = XLSX.utils.book_new();

  // Group by decoration method
  const grouped = orders.reduce((acc, order) => {
    const method = order.decoration_method;
    if (!acc[method]) acc[method] = [];
    acc[method].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Create a sheet for each decoration method
  Object.entries(grouped).forEach(([method, methodOrders]) => {
    const data = methodOrders.map(order => ({
      'Order #': order.order_number,
      'Customer': order.customer_name || 'N/A',
      'Qty': order.quantity,
      'Due Date': formatDate(order.due_date),
      'Priority': order.priority ? 'RUSH' : '',
      'Notes': order.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const sheetName = method.replace('_', ' ').toUpperCase().substring(0, 31); // Excel sheet name limit
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // Download file
  const filename = `production-by-station-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

