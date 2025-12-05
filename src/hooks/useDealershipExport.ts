/**
 * useDealershipExport Hook
 *
 * Custom hook for exporting dealership data in multiple formats
 *
 * Features:
 * - Export to Excel (.xlsx) with multiple sheets
 * - Export to JSON for programmatic use
 * - Select what data to include (users, orders, contacts, all)
 * - Progress tracking during export
 *
 * @module hooks/useDealershipExport
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import ExcelJS from 'exceljs';

export type ExportFormat = 'excel' | 'json';
export type ExportScope = 'users' | 'orders' | 'all';

interface ExportOptions {
  dealershipId: number;
  dealershipName: string;
  format: ExportFormat;
  scope: ExportScope;
}

interface ExportProgress {
  stage: 'idle' | 'fetching' | 'processing' | 'downloading' | 'complete' | 'error';
  message: string;
  percentage: number;
}

export function useDealershipExport() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ExportProgress>({
    stage: 'idle',
    message: '',
    percentage: 0
  });

  /**
   * Export dealership data
   */
  const exportDealership = async (options: ExportOptions) => {
    try {
      setProgress({ stage: 'fetching', message: 'Fetching dealership data...', percentage: 20 });

      // Determine what to include based on scope
      const includeUsers = options.scope === 'users' || options.scope === 'all';
      const includeOrders = options.scope === 'orders' || options.scope === 'all';
      const includeContacts = options.scope === 'all';

      // Call RPC function to get export data
      const { data, error } = await supabase.rpc('get_dealership_export_data', {
        p_dealership_id: options.dealershipId,
        p_include_users: includeUsers,
        p_include_orders: includeOrders,
        p_include_contacts: includeContacts
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch export data');
      }

      setProgress({ stage: 'processing', message: 'Processing data...', percentage: 50 });

      // Export based on format
      if (options.format === 'excel') {
        await exportToExcel(data, options.dealershipName, options.scope);
      } else {
        exportToJSON(data, options.dealershipName, options.scope);
      }

      setProgress({ stage: 'complete', message: 'Export complete!', percentage: 100 });

      toast({
        title: t('common.success'),
        description: `${options.dealershipName} data exported successfully`
      });

      // Reset progress after 2 seconds
      setTimeout(() => {
        setProgress({ stage: 'idle', message: '', percentage: 0 });
      }, 2000);

    } catch (error: any) {
      console.error('Export error:', error);
      setProgress({ stage: 'error', message: error.message, percentage: 0 });

      toast({
        title: t('common.error'),
        description: error.message || 'Failed to export dealership data',
        variant: 'destructive'
      });
    }
  };

  /**
   * Export to Excel format
   */
  const exportToExcel = async (
    data: any,
    dealershipName: string,
    scope: ExportScope
  ) => {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'MyDetailArea';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add Dealership Info Sheet (always included)
    const infoSheet = workbook.addWorksheet('Dealership Info');
    const dealership = data.dealership;

    infoSheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    infoSheet.addRows([
      { field: 'Name', value: dealership.name },
      { field: 'Email', value: dealership.email },
      { field: 'Phone', value: dealership.phone },
      { field: 'Address', value: dealership.address },
      { field: 'City', value: dealership.city },
      { field: 'State', value: dealership.state },
      { field: 'Status', value: dealership.status },
      { field: 'Subscription Plan', value: dealership.subscription_plan },
      { field: 'Created At', value: new Date(dealership.created_at).toLocaleString() },
      { field: 'Export Date', value: new Date().toLocaleString() }
    ]);

    // Style header row
    infoSheet.getRow(1).font = { bold: true };
    infoSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add Users Sheet (if included)
    if (scope === 'users' || scope === 'all') {
      const usersSheet = workbook.addWorksheet('Users');
      const users = data.users || [];

      if (users.length > 0) {
        usersSheet.columns = [
          { header: 'Email', key: 'email', width: 30 },
          { header: 'First Name', key: 'first_name', width: 20 },
          { header: 'Last Name', key: 'last_name', width: 20 },
          { header: 'Role', key: 'role', width: 15 },
          { header: 'Custom Role', key: 'custom_role', width: 20 },
          { header: 'Phone', key: 'phone', width: 15 },
          { header: 'Membership Active', key: 'membership_active', width: 18 },
          { header: 'Joined Date', key: 'membership_created', width: 20 }
        ];

        users.forEach((user: any) => {
          usersSheet.addRow({
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            custom_role: user.custom_role || 'N/A',
            phone: user.phone || '',
            membership_active: user.membership_active ? 'Yes' : 'No',
            membership_created: new Date(user.membership_created).toLocaleString()
          });
        });

        // Style header row
        usersSheet.getRow(1).font = { bold: true };
        usersSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }
    }

    // Add Orders Sheets (if included)
    if (scope === 'orders' || scope === 'all') {
      const orders = data.orders || {};

      // Sales Orders
      if (orders.sales_orders && orders.sales_orders.length > 0) {
        const salesSheet = workbook.addWorksheet('Sales Orders');
        addOrdersToSheet(salesSheet, orders.sales_orders, 'Sales');
      }

      // Service Orders
      if (orders.service_orders && orders.service_orders.length > 0) {
        const serviceSheet = workbook.addWorksheet('Service Orders');
        addOrdersToSheet(serviceSheet, orders.service_orders, 'Service');
      }

      // Recon Orders
      if (orders.recon_orders && orders.recon_orders.length > 0) {
        const reconSheet = workbook.addWorksheet('Recon Orders');
        addOrdersToSheet(reconSheet, orders.recon_orders, 'Recon');
      }

      // CarWash Orders
      if (orders.car_wash_orders && orders.car_wash_orders.length > 0) {
        const carwashSheet = workbook.addWorksheet('CarWash Orders');
        addOrdersToSheet(carwashSheet, orders.car_wash_orders, 'CarWash');
      }
    }

    // Add Contacts Sheet (if included)
    if (scope === 'all') {
      const contacts = data.contacts || [];
      if (contacts.length > 0) {
        const contactsSheet = workbook.addWorksheet('Contacts');

        contactsSheet.columns = [
          { header: 'Name', key: 'name', width: 25 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Phone', key: 'phone', width: 15 },
          { header: 'Company', key: 'company', width: 25 },
          { header: 'Created At', key: 'created_at', width: 20 }
        ];

        contacts.forEach((contact: any) => {
          contactsSheet.addRow({
            name: `${contact.first_name} ${contact.last_name}`,
            email: contact.email,
            phone: contact.phone,
            company: contact.company || '',
            created_at: new Date(contact.created_at).toLocaleString()
          });
        });

        // Style header row
        contactsSheet.getRow(1).font = { bold: true };
        contactsSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }
    }

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const filename = `${dealershipName.replace(/\s+/g, '_')}_${scope}_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadFile(blob, filename);
  };

  /**
   * Helper: Add orders to Excel sheet
   */
  const addOrdersToSheet = (sheet: ExcelJS.Worksheet, orders: any[], orderType: string) => {
    sheet.columns = [
      { header: 'Order Number', key: 'order_number', width: 20 },
      { header: 'Customer Name', key: 'customer_name', width: 25 },
      { header: 'VIN', key: 'vin', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    orders.forEach((order: any) => {
      sheet.addRow({
        order_number: order.order_number || order.id,
        customer_name: order.customer_name || 'N/A',
        vin: order.vin || '',
        status: order.status,
        total_amount: order.total_amount ? `$${order.total_amount}` : '$0.00',
        created_at: new Date(order.created_at).toLocaleString(),
        updated_at: new Date(order.updated_at).toLocaleString()
      });
    });

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  };

  /**
   * Export to JSON format
   */
  const exportToJSON = (data: any, dealershipName: string, scope: ExportScope) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    const filename = `${dealershipName.replace(/\s+/g, '_')}_${scope}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(blob, filename);
  };

  /**
   * Helper: Download file to user's browser
   */
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    exportDealership,
    progress,
    isExporting: progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error'
  };
}
