/**
 * Utility functions for exporting data to various formats
 *
 * NOTE: Excel exports now handled by Edge Function (supabase/functions/generate-excel-report)
 * This keeps the client bundle lightweight and moves heavy processing to the server
 */

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

/**
 * Excel export has been moved to Edge Function for better performance
 * Use the useServerExport hook instead:
 *
 * import { useServerExport } from '@/hooks/useServerExport';
 * const { exportToExcel } = useServerExport({ reportType: 'get_ready' });
 *
 * This eliminates 2.5MB from the client bundle and improves performance
 */

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
