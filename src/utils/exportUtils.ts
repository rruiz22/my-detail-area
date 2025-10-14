/**
 * Utility functions for exporting data to various formats
 */

import * as XLSX from 'xlsx';

// Export to CSV
export function exportToCSV(data: any[], filename: string = 'export') {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Add row numbers
  const dataWithRowNumbers = data.map((row, index) => ({
    '#': index + 1,
    ...row
  }));

  // Get headers from first object
  const headers = Object.keys(dataWithRowNumbers[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...dataWithRowNumbers.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Export to Excel (XLSX format using xlsx library)
export function exportToExcel(data: any[], filename: string = 'export') {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Add row numbers
  const dataWithRowNumbers = data.map((row, index) => ({
    '#': index + 1,
    ...row
  }));

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataWithRowNumbers);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 5 },  // # column
    { wch: 12 }, // Stock Number
    { wch: 18 }, // VIN
    { wch: 25 }, // Vehicle
    { wch: 6 },  // Year
    { wch: 12 }, // Make
    { wch: 12 }, // Model
    { wch: 15 }, // Trim
    { wch: 15 }, // Step
    { wch: 12 }, // Workflow
    { wch: 10 }, // Priority
    { wch: 10 }, // Status
    { wch: 12 }, // In Process
    { wch: 12 }, // Step Time
    { wch: 12 }, // To Frontline
    { wch: 10 }, // Progress
    { wch: 15 }, // Assigned To
    { wch: 12 }, // Total Work Items
    { wch: 12 }, // Pending Items
    { wch: 15 }, // In Progress Items
    { wch: 14 }, // Completed Items
    { wch: 13 }, // Declined Items
    { wch: 18 }, // Work Items Completion
    { wch: 30 }, // Notes
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehicles');

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Format vehicle data for export
export function formatVehiclesForExport(vehicles: any[]) {
  return vehicles.map(vehicle => {
    // Calculate work items summary
    const workItemCounts = vehicle.work_item_counts || {
      pending: 0,
      in_progress: 0,
      completed: 0,
      declined: 0
    };

    const totalWorkItems = workItemCounts.pending +
                           workItemCounts.in_progress +
                           workItemCounts.completed +
                           workItemCounts.declined;

    const completionRate = totalWorkItems > 0
      ? Math.round((workItemCounts.completed / totalWorkItems) * 100)
      : 0;

    return {
      'Stock Number': vehicle.stock_number || '',
      'VIN': vehicle.vin || '',
      'Vehicle': `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim(),
      'Year': vehicle.year || '',
      'Make': vehicle.make || '',
      'Model': vehicle.model || '',
      'Trim': vehicle.trim || '',
      'Step': vehicle.step_name || '',
      'Workflow': vehicle.workflow_type || '',
      'Priority': vehicle.priority || '',
      'Status': vehicle.status || '',
      'In Process': vehicle.t2l || '',
      'Step Time': vehicle.days_in_step || '',
      'To Frontline': vehicle.days_to_frontline || '',
      'Progress': vehicle.progress ? `${vehicle.progress}%` : '',
      'Assigned To': vehicle.assigned_to || 'Unassigned',
      // Work Items Summary
      'Total Work Items': totalWorkItems,
      'Pending Items': workItemCounts.pending || 0,
      'In Progress Items': workItemCounts.in_progress || 0,
      'Completed Items': workItemCounts.completed || 0,
      'Declined Items': workItemCounts.declined || 0,
      'Work Items Completion': totalWorkItems > 0 ? `${completionRate}%` : '0%',
      'Notes': vehicle.notes || ''
    };
  });
}
