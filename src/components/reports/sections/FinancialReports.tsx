import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { MetricCard } from '../ReportsLayout';
import { useRevenueAnalytics, useDepartmentRevenue, type ReportsFilters } from '@/hooks/useReportsData';
import type { ChartTooltipProps } from '@/types/charts';
import { useServerExport } from '@/hooks/useServerExport';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useSenderInfo } from '@/hooks/useSenderInfo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { getWeek, getYear } from 'date-fns';

interface FinancialReportsProps {
  filters: ReportsFilters;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({ filters }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Determine grouping based on date range for accurate metrics
  const getDaysInRange = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysInRange = getDaysInRange(filters.startDate, filters.endDate);
  const grouping = daysInRange <= 7 ? 'daily' : daysInRange <= 31 ? 'weekly' : 'monthly';

  const { data: revenueData, isLoading } = useRevenueAnalytics(filters, grouping);
  const { data: departmentData = [], isLoading: deptLoading } = useDepartmentRevenue(filters);
  const { currentDealership } = useAccessibleDealerships();
  const { senderInfo } = useSenderInfo();
  const { user } = useAuth();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const dealerName = currentDealership?.name || 'Unknown Dealer';

  // Safe defaults for senderInfo
  const companyName = senderInfo?.company_name || 'Dealer Detail Service LLC';

  // Get user's full name
  const getUserFullName = () => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Unknown User';
  };

  const userName = getUserFullName();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    }).format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/New_York',
    }).format(date);
  };

  const getWeekInfo = (startDate: Date, endDate: Date) => {
    // Convert to Boston timezone for accurate week calculation
    const bostonDate = new Date(startDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const week = getWeek(bostonDate, { weekStartsOn: 0 });
    const year = getYear(bostonDate);

    return `Week ${week} of ${year}`;
  };

  // Export to Excel function with formatting
  const handleExportToExcel = async () => {
    if (!departmentData || departmentData.length === 0) {
      toast({ variant: 'destructive', description: 'No data to export' });
      return;
    }

    setIsExportingExcel(true);

    try {
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Department Revenue');

      // Set column widths - auto-adjust based on content
      worksheet.columns = [
        { width: 22 },
        { width: 18 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
      ];

      // Print settings - make it print ready
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0, // Auto height
        margins: {
          left: 0.7,
          right: 0.7,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
        printArea: 'A1:E100', // Adjust based on content
      };

      let currentRow = 1;

      // Company Header - Sender Info
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const companyCell = worksheet.getCell(`A${currentRow}`);
      companyCell.value = companyName.toUpperCase();
      companyCell.font = { size: 16, bold: true, color: { argb: 'FF6366F1' } };
      companyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 24;
      currentRow += 1;

      // Dealer Name - More prominent (no background)
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const dealerCell = worksheet.getCell(`A${currentRow}`);
      dealerCell.value = dealerName.toUpperCase();
      dealerCell.font = { size: 14, bold: true, color: { argb: 'FF111827' } };
      dealerCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 20;
      currentRow += 1;

      // Title - Merge cells for long title
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const titleCell = worksheet.getCell(`A${currentRow}`);
      titleCell.value = 'Department Revenue Report';
      titleCell.font = { size: 14, bold: true, color: { argb: 'FF111827' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 20;
      currentRow += 1;

      // Period - Merge cells for long date range
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const periodCell = worksheet.getCell(`A${currentRow}`);
      periodCell.value = `Period: ${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`;
      periodCell.font = { size: 9, color: { argb: 'FF374151' } };
      periodCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 15;
      currentRow += 1;

      // Week info - Merge cells
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const weekCell = worksheet.getCell(`A${currentRow}`);
      weekCell.value = getWeekInfo(filters.startDate, filters.endDate);
      weekCell.font = { size: 9, color: { argb: 'FF6366F1' }, bold: true };
      weekCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 15;
      currentRow += 1;

      // Generated date and time - Merge cells
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const generatedCell = worksheet.getCell(`A${currentRow}`);
      generatedCell.value = `Generated: ${formatDateTime(new Date())}`;
      generatedCell.font = { size: 8, color: { argb: 'FF6B7280' }, italic: true };
      generatedCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 14;
      currentRow += 2;

      // Department Overview section title - Merge cells
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const overviewTitleCell = worksheet.getCell(`A${currentRow}`);
      overviewTitleCell.value = 'Department Overview';
      overviewTitleCell.font = { size: 11, bold: true, color: { argb: 'FF111827' } };
      overviewTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getRow(currentRow).height = 18;
      currentRow += 1;

      // Table headers
      const headerRow = worksheet.getRow(currentRow);
      const headers = ['Department', 'Total Revenue', 'Orders', 'Avg Order Value', 'Completion Rate'];
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF6366F1' }, // Primary color
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      });
      headerRow.height = 20;
      currentRow += 1;

      // Data rows
      departmentData.forEach((dept, index) => {
        const dataRow = worksheet.getRow(currentRow);
        const rowData = [
          dept.name,
          dept.revenue,
          dept.orders,
          dept.avgOrderValue,
          dept.completionRate / 100,
        ];

        rowData.forEach((value, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          cell.value = value;
          cell.font = { size: 9, color: { argb: 'FF374151' } };

          // Apply number formats
          if (colIndex === 1 || colIndex === 3) {
            // Currency format
            cell.numFmt = '$#,##0.00';
          } else if (colIndex === 4) {
            // Percentage format
            cell.numFmt = '0.0%';
          }

          // Alignment - All columns centered
          cell.alignment = { vertical: 'middle', horizontal: 'center' };

          // Alternating row colors
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' },
            };
          }

          // Borders
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
        });

        dataRow.height = 18;
        currentRow += 1;
      });

      currentRow += 1;

      // Summary Totals section - Merge cells
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const summaryTitleCell = worksheet.getCell(`A${currentRow}`);
      summaryTitleCell.value = 'Summary Totals';
      summaryTitleCell.font = { size: 10, bold: true, color: { argb: 'FF111827' } };
      summaryTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getRow(currentRow).height = 16;
      currentRow += 1;

      // Calculate totals
      const totalRevenue = departmentData.reduce((sum, dept) => sum + dept.revenue, 0);
      const totalOrders = departmentData.reduce((sum, dept) => sum + dept.orders, 0);
      const totalAvgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const avgCompletionRate = departmentData.reduce((sum, dept) => sum + dept.completionRate, 0) / departmentData.length / 100;

      // Summary table headers
      const summaryHeaderRow = worksheet.getRow(currentRow);
      ['Metric', 'Value'].forEach((header, index) => {
        const cell = summaryHeaderRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF374151' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      });
      summaryHeaderRow.height = 18;
      currentRow += 1;

      // Summary data
      const summaryData = [
        ['Total Revenue (All Departments)', totalRevenue],
        ['Total Orders (All Departments)', totalOrders],
        ['Average Order Value (Overall)', totalAvgOrderValue],
        ['Average Completion Rate', avgCompletionRate],
      ];

      summaryData.forEach((rowData, index) => {
        const summaryRow = worksheet.getRow(currentRow);

        const metricCell = summaryRow.getCell(1);
        metricCell.value = rowData[0];
        metricCell.font = { size: 9, color: { argb: 'FF374151' } };
        metricCell.alignment = { vertical: 'middle', horizontal: 'left' };

        const valueCell = summaryRow.getCell(2);
        valueCell.value = rowData[1];
        valueCell.font = { size: 9, color: { argb: 'FF374151' }, bold: true };
        valueCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Format based on type
        if (index === 0 || index === 2) {
          // Currency format for Total Revenue and Avg Order Value
          valueCell.numFmt = '$#,##0.00';
        } else if (index === 3) {
          // Percentage format for Completion Rate
          valueCell.numFmt = '0.0%';
        }

        // Alternating colors
        if (index % 2 === 0) {
          [metricCell, valueCell].forEach(cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' },
            };
          });
        }

        // Borders
        [metricCell, valueCell].forEach(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
        });

        summaryRow.height = 17;
        currentRow += 1;
      });

      currentRow += 2;

      // Footer - Generated by User - Merge cells
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const footerCell = worksheet.getCell(`A${currentRow}`);
      footerCell.value = `Generated by ${userName}`;
      footerCell.font = { size: 8, color: { argb: 'FF6B7280' }, italic: true };
      footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 14;
      currentRow += 1;

      // Footer - Developed by My Detail Area - Merge cells
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const developedByCell = worksheet.getCell(`A${currentRow}`);
      developedByCell.value = 'Developed by My Detail Area';
      developedByCell.font = { size: 8, color: { argb: 'FF6366F1' }, bold: true };
      developedByCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 14;
      currentRow += 1;

      // Footer - Report metadata - Merge cells
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const metadataCell = worksheet.getCell(`A${currentRow}`);
      const reportDate = new Date();
      const year = reportDate.getFullYear();
      const month = String(reportDate.getMonth() + 1).padStart(2, '0');
      const day = String(reportDate.getDate()).padStart(2, '0');
      const hours = String(reportDate.getHours()).padStart(2, '0');
      const minutes = String(reportDate.getMinutes()).padStart(2, '0');
      const timeCode = `${hours}${minutes}`;
      const reportId = `${year}${month}${day}-${timeCode}`;
      metadataCell.value = `${dealerName} | Report ID: DPT-REV-${reportId}`;
      metadataCell.font = {
        name: 'Arial',
        size: 8,
        color: { argb: 'FF4B5563' }, // Gris medio oscuro (#4B5563 - gray-600)
        italic: true
      };
      metadataCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 14;

      // Auto-adjust columns based on content
      worksheet.columns.forEach((column: any, index) => {
        let maxLength = 0;
        const columnLetter = String.fromCharCode(65 + index);

        worksheet.getColumn(index + 1).eachCell?.({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? String(cell.value).length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });

        const adjustedWidth = Math.min(Math.max(maxLength + 2, 12), 30);
        column.width = adjustedWidth;
      });

      // Set print area to actual content
      const lastRow = currentRow;
      worksheet.pageSetup.printArea = `A1:E${lastRow}`;

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const sanitizedDealerName = dealerName.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${sanitizedDealerName}_department_revenue_${formatDate(filters.startDate)}_to_${formatDate(filters.endDate)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ description: 'Excel exported successfully' });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({ variant: 'destructive', description: 'Failed to export Excel' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to PDF function
  const handleExportToPDF = async () => {
    if (!departmentData || departmentData.length === 0) {
      toast({ variant: 'destructive', description: 'No data to export' });
      return;
    }

    setIsExportingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colors
      const colors = {
        gray50: [249, 250, 251] as [number, number, number],
        gray100: [243, 244, 246] as [number, number, number],
        gray700: [55, 65, 81] as [number, number, number],
        gray900: [17, 24, 39] as [number, number, number],
        primary: [99, 102, 241] as [number, number, number],
      };

      let currentY = 20;
      const pageWidth = doc.internal.pageSize.width;

      // Company Header - Sender Info
      doc.setFontSize(16);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
      currentY += 12;

      // Dealer Name - More prominent (no background)
      doc.setFontSize(18);
      doc.setTextColor(colors.gray900[0], colors.gray900[1], colors.gray900[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(dealerName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
      currentY += 12;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(colors.gray900[0], colors.gray900[1], colors.gray900[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Department Revenue Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Date range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.gray700[0], colors.gray700[1], colors.gray700[2]);
      doc.text(`Period: ${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;

      // Week info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text(getWeekInfo(filters.startDate, filters.endDate), pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;

      // Generated date and time
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(colors.gray700[0], colors.gray700[1], colors.gray700[2]);
      doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Department Overview section title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.gray900[0], colors.gray900[1], colors.gray900[2]);
      doc.text('Department Overview', 20, currentY);
      currentY += 10;

      const summaryData = departmentData.map((dept) => [
        dept.name,
        formatCurrency(dept.revenue),
        dept.orders.toString(),
        formatCurrency(dept.avgOrderValue),
        `${dept.completionRate.toFixed(1)}%`,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Department', 'Total Revenue', 'Orders', 'Avg Order Value', 'Completion Rate']],
        body: summaryData,
        theme: 'striped',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: colors.gray700,
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center' }, // Department
          1: { halign: 'center' }, // Total Revenue
          2: { halign: 'center' }, // Orders
          3: { halign: 'center' }, // Avg Order Value
          4: { halign: 'center' }, // Completion Rate
        },
        alternateRowStyles: {
          fillColor: colors.gray50,
        },
        margin: { left: 20, right: 20 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Total summary
      const totalRevenue = departmentData.reduce((sum, dept) => sum + dept.revenue, 0);
      const totalOrders = departmentData.reduce((sum, dept) => sum + dept.orders, 0);
      const totalAvgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const avgCompletionRate = departmentData.reduce((sum, dept) => sum + dept.completionRate, 0) / departmentData.length;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.gray900[0], colors.gray900[1], colors.gray900[2]);
      doc.text('Summary Totals', 20, currentY);
      currentY += 8;

      const totalData = [
        ['Total Revenue (All Departments)', formatCurrency(totalRevenue)],
        ['Total Orders (All Departments)', totalOrders.toString()],
        ['Average Order Value (Overall)', formatCurrency(totalAvgOrderValue)],
        ['Average Completion Rate', `${avgCompletionRate.toFixed(1)}%`],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: totalData,
        theme: 'plain',
        headStyles: {
          fillColor: colors.gray700,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: colors.gray700,
        },
        columnStyles: {
          0: { halign: 'left' },   // Metric - mantener a la izquierda para legibilidad
          1: { halign: 'center' }, // Value - centrado
        },
        alternateRowStyles: {
          fillColor: colors.gray50,
        },
        margin: { left: 20, right: 20 },
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      let footerY = pageHeight - 20;

      // Generated by User
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(colors.gray700[0], colors.gray700[1], colors.gray700[2]);
      doc.text(`Generated by ${userName}`, pageWidth / 2, footerY, { align: 'center' });
      footerY += 5;

      // Developed by My Detail Area
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text('Developed by My Detail Area', pageWidth / 2, footerY, { align: 'center' });
      footerY += 5;

      // Metadata
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175); // gray-400
      const reportDate = new Date();
      const year = reportDate.getFullYear();
      const month = String(reportDate.getMonth() + 1).padStart(2, '0');
      const day = String(reportDate.getDate()).padStart(2, '0');
      const hours = String(reportDate.getHours()).padStart(2, '0');
      const minutes = String(reportDate.getMinutes()).padStart(2, '0');
      const timeCode = `${hours}${minutes}`;
      const reportId = `${year}${month}${day}-${timeCode}`;
      doc.text(`${dealerName} | Report ID: DPT-REV-${reportId}`, pageWidth / 2, footerY, { align: 'center' });

      // Page number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(colors.gray700[0], colors.gray700[1], colors.gray700[2]);
      doc.text(`Page 1`, doc.internal.pageSize.width - 30, pageHeight - 10);

      // Save PDF
      const sanitizedDealerName = dealerName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedDealerName}_department_revenue_${formatDate(filters.startDate)}_to_${formatDate(filters.endDate)}.pdf`;
      doc.save(filename);

      toast({ description: 'PDF exported successfully' });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({ variant: 'destructive', description: 'Failed to export PDF' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl p-4 backdrop-blur-sm">
          <p className="font-bold text-slate-900 mb-3 text-sm border-b pb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs font-medium text-slate-600">{entry.name}:</span>
                </div>
                <span className="text-sm font-bold" style={{ color: entry.color }}>
                  {entry.name.includes('Revenue') || entry.name.includes('Value')
                    ? formatCurrency(Number(entry.value))
                    : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const revenueChartData = revenueData?.period_data.map((item) => ({
    period: item.period,
    revenue: item.revenue,
    orders: item.orders,
    avgOrderValue: item.orders > 0 ? item.revenue / item.orders : 0
  })) || [];

  const topServicesData = revenueData?.top_services || [];
  const growthRate = revenueData?.growth_rate || 0;
  const isPositiveGrowth = growthRate >= 0;

  // Calculate total orders and averages
  const totalOrders = revenueData?.period_data.reduce((sum, item) => sum + item.orders, 0) || 0;
  const avgOrdersPerPeriod = revenueData?.period_data.length
    ? totalOrders / revenueData.period_data.length
    : 0;

  // Calculate last week comparison for orders
  const periodData = revenueData?.period_data || [];
  const lastWeek = periodData[periodData.length - 1];
  const previousWeek = periodData[periodData.length - 2];

  const lastWeekOrders = lastWeek?.orders || 0;
  const previousWeekOrders = previousWeek?.orders || 0;
  const ordersGrowth = previousWeekOrders > 0
    ? ((lastWeekOrders - previousWeekOrders) / previousWeekOrders) * 100
    : 0;

  const isOrdersGrowthPositive = ordersGrowth >= 0;

  // Calculate total from departments (sum of all 4 departments)
  const totalByDepartments = departmentData.reduce((sum, dept) => sum + dept.revenue, 0);
  const totalOrdersByDepartments = departmentData.reduce((sum, dept) => sum + dept.orders, 0);

  return (
    <div className="space-y-6">
      {/* Executive Financial Summary */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Financial Performance Overview</CardTitle>
          <CardDescription className="mt-1">
            Revenue insights and financial metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatCurrency(revenueData?.total_revenue || 0)}</div>
              <div className="flex items-center gap-2 text-xs mt-1">
                {isPositiveGrowth ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +{growthRate.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {growthRate.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">vs last week</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Avg per {grouping === 'daily' ? 'Day' : grouping === 'weekly' ? 'Week' : 'Month'}
                </span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatCurrency(revenueData?.avg_revenue_per_period || 0)}</div>
              <div className="flex items-center gap-2 text-xs mt-1">
                {isPositiveGrowth ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +{growthRate.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {growthRate.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">vs previous period</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Orders</span>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <div className="flex items-center gap-2 text-xs mt-1">
                {isOrdersGrowthPositive ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +{ordersGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {ordersGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">vs last week</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Avg Orders/{grouping === 'daily' ? 'Day' : grouping === 'weekly' ? 'Week' : 'Month'}
                </span>
                {isOrdersGrowthPositive ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${isOrdersGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
                {avgOrdersPerPeriod.toFixed(0)}
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                {isOrdersGrowthPositive ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +{ordersGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {ordersGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">vs previous period</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg space-y-1 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-700">Total by Departments</span>
                <DollarSign className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-900">{formatCurrency(totalByDepartments)}</div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="text-indigo-600 font-medium">{totalOrdersByDepartments} orders</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Analysis Charts */}
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
          <TabsTrigger value="services">Top Services</TabsTrigger>
          <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          {/* Export Buttons */}
          <div className="flex justify-end gap-3 mb-4">
            <Button
              onClick={handleExportToExcel}
              disabled={isExportingExcel || deptLoading || departmentData.length === 0}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isExportingExcel ? 'Exporting...' : 'Export to Excel'}
            </Button>
            <Button
              onClick={handleExportToPDF}
              disabled={isExportingPDF || deptLoading || departmentData.length === 0}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {isExportingPDF ? 'Generating...' : 'Export to PDF'}
            </Button>
          </div>

          {/* Department Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {departmentData.map((dept, index) => {
              const colors = [
                { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
                { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
                { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
                { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
              ];
              const color = colors[index % colors.length];

              return (
                <Card key={dept.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-muted-foreground">{dept.name}</span>
                      <div className={`p-2 rounded-lg ${color.bg} border ${color.border}`}>
                        <DollarSign className={`h-4 w-4 ${color.text}`} />
                      </div>
                    </div>
                    <div className={`text-2xl font-bold mb-1 ${color.text}`}>
                      {formatCurrency(dept.revenue)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>{dept.orders} orders</span>
                      <span>{dept.completionRate.toFixed(0)}% completed</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Department Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Department</CardTitle>
                <CardDescription>
                  Total revenue generated per department
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deptLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : departmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="name"
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatCompactCurrency}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '2px solid hsl(var(--border))',
                          borderRadius: '8px',
                          padding: '12px'
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="hsl(var(--primary))"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No department data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Order Value by Department</CardTitle>
                <CardDescription>
                  Compare average transaction values across departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deptLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : departmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="name"
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatCompactCurrency}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Avg Order Value']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '2px solid hsl(var(--border))',
                          borderRadius: '8px',
                          padding: '12px'
                        }}
                      />
                      <Bar
                        dataKey="avgOrderValue"
                        fill="hsl(var(--chart-2))"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No department data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Detailed Table */}
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle>Department Performance Summary</CardTitle>
              <CardDescription>
                Detailed metrics for each department
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {deptLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : departmentData.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b-2 border-slate-300">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-bold text-slate-700">Department</th>
                        <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">Total Revenue</th>
                        <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">Orders</th>
                        <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">Avg Order Value</th>
                        <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentData.map((dept, index) => (
                        <tr
                          key={dept.name}
                          className={`border-b transition-colors ${
                            index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-sm">{dept.name}</td>
                          <td className="px-6 py-4 text-right font-medium text-green-600">
                            {formatCurrency(dept.revenue)}
                          </td>
                          <td className="px-6 py-4 text-right">{dept.orders}</td>
                          <td className="px-6 py-4 text-right text-blue-600 font-medium">
                            {formatCurrency(dept.avgOrderValue)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={dept.completionRate} className="w-20 h-2" />
                              <span className="text-sm font-medium w-12">{dept.completionRate.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No department data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Performance Over Time</CardTitle>
              <CardDescription>
                Monthly revenue trends with order volume correlation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="left"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={formatCompactCurrency}
                      stroke="#cbd5e1"
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      fill="url(#colorRevenue)"
                      strokeWidth={3}
                      name="Revenue"
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orders"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#10b981", r: 5, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7 }}
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Generators</CardTitle>
                <CardDescription>
                  Services ranked by total revenue contribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-72 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : topServicesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={topServicesData} layout="horizontal">
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickFormatter={formatCompactCurrency}
                        stroke="#cbd5e1"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        width={140}
                        stroke="#cbd5e1"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="revenue"
                        fill="url(#colorBar)"
                        radius={[0, 8, 8, 0]}
                        name="Revenue"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No service data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>
                  Detailed breakdown of service contributions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : topServicesData.length > 0 ? (
                  <>
                    {topServicesData.slice(0, 5).map((service, index) => {
                      const percentage = revenueData?.total_revenue
                        ? (service.revenue / revenueData.total_revenue) * 100
                        : 0;
                      const colors = [
                        'from-blue-500 to-blue-600',
                        'from-green-500 to-green-600',
                        'from-purple-500 to-purple-600',
                        'from-orange-500 to-orange-600',
                        'from-pink-500 to-pink-600',
                      ];
                      return (
                        <div key={index} className="p-4 border-2 border-slate-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all space-y-3 bg-gradient-to-br from-white to-slate-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-bold text-sm mb-1.5 text-slate-800">{service.name}</div>
                              <div className="text-xs font-medium text-slate-500">
                                {percentage.toFixed(1)}% of total revenue
                              </div>
                            </div>
                            <Badge variant="outline" className={`ml-2 font-mono font-bold bg-gradient-to-r ${colors[index % colors.length]} text-white border-0 shadow-sm`}>
                              {formatCurrency(service.revenue)}
                            </Badge>
                          </div>
                          <Progress value={percentage} className="h-2.5" />
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No service data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Average Order Value Analysis</CardTitle>
              <CardDescription>
                Track changes in transaction values over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={formatCompactCurrency}
                      stroke="#cbd5e1"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="avgOrderValue"
                      stroke="#f59e0b"
                      strokeWidth={4}
                      dot={{ fill: "#f59e0b", r: 6, strokeWidth: 3, stroke: "#fff" }}
                      activeDot={{ r: 8, strokeWidth: 3 }}
                      name="Avg Order Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No analysis data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
