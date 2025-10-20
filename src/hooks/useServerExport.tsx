import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from './useAccessibleDealerships';
import { toast } from '@/hooks/use-toast';

type ExportFormat = 'excel' | 'csv';
type ReportType = 'get_ready' | 'stock_inventory' | 'generic';

interface UseServerExportOptions {
  reportType?: ReportType;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useServerExport(options: UseServerExportOptions = {}) {
  const { reportType = 'generic', onSuccess, onError } = options;
  const [isExporting, setIsExporting] = useState(false);
  const { currentDealership } = useAccessibleDealerships();

  /**
   * Export data to Excel using server-side generation (Edge Function)
   * This eliminates the need for ExcelJS in the client bundle
   */
  const exportToExcel = async (data: any[], filename: string = 'export') => {
    if (!currentDealership?.id) {
      toast({
        title: 'Error',
        description: 'No dealership selected',
        variant: 'destructive',
      });
      return;
    }

    if (!data || data.length === 0) {
      toast({
        title: 'Warning',
        description: 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get function URL
      const { data: { project_url } } = await supabase.functions.invoke('_internal', { method: 'GET' })
        .then(() => ({ data: { project_url: '' } }))
        .catch(() => ({ data: { project_url: '' } }));

      // Construct Edge Function URL
      const functionUrl = `${Deno.env?.get?.('SUPABASE_URL') || supabase.supabaseUrl}/functions/v1/generate-excel-report`;

      // Call Edge Function to generate Excel
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          filename,
          dealerId: currentDealership.id,
          reportType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Get the blob
      const blob = await response.blob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.headers.get('Content-Disposition')?.split('filename="')[1]?.slice(0, -1) || `${filename}.xlsx`;
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast({
        description: 'Report generated successfully',
        variant: 'default',
      });

      onSuccess?.();

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive',
      });

      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export to CSV (client-side, lightweight)
   * CSV export remains on client as it doesn't require heavy libraries
   */
  const exportToCSV = (data: any[], filename: string = 'export') => {
    if (!data || data.length === 0) {
      toast({
        title: 'Warning',
        description: 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
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

      toast({
        description: 'CSV exported successfully',
        variant: 'default',
      });

      onSuccess?.();

    } catch (error) {
      console.error('CSV export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export CSV',
        variant: 'destructive',
      });

      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToExcel,
    exportToCSV,
    isExporting,
  };
}
