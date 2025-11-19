/**
 * PDF TEMPLATES DEMO
 * Created: 2025-01-18
 * Description: Demo/test file for PDF templates - Use this to validate the design system
 *
 * Usage:
 * 1. Import this file in a component
 * 2. Call the demo functions to generate sample PDFs
 * 3. Verify design consistency and functionality
 */

import {
  downloadInvoicePDF,
  generatePayrollReportPDF,
  generateAttendanceReportPDF,
  generateReportPDF,
  type DealershipInfo,
  type InvoiceData,
  type PayrollReportData,
  type AttendanceReportData,
} from './index';

// =====================================================
// DEMO DATA
// =====================================================

/**
 * Sample dealership information
 */
const DEMO_DEALERSHIP: DealershipInfo = {
  name: 'BMW of Sudbury',
  address: '123 Main Street, Sudbury, MA 01776',
  phone: '(555) 123-4567',
  email: 'info@bmwofsudbury.com',
};

/**
 * Sample invoice data (realistic data)
 */
const DEMO_INVOICE: InvoiceData = {
  // Invoice metadata
  invoiceNumber: 'INV-2025-001',
  issueDate: new Date('2025-01-18'),
  dueDate: new Date('2025-02-18'),

  // Billing information
  billTo: {
    name: 'AutoMax Dealership Group',
    address: '456 Commerce Boulevard, Boston, MA 02101',
    email: 'accounts.payable@automax.com',
    phone: '(555) 987-6543',
  },

  // Line items (sample vehicle detail orders)
  items: [
    {
      description: '2024 BMW X5 - Premium Detail Package',
      quantity: 1,
      unitPrice: 250.0,
      totalPrice: 250.0,
      date: '2025-01-15',
      orderNumber: 'SO-2025-001',
      stockNumber: 'BMW2024X5001',
      vin: 'WBAJV8C52LC123456',
      services: 'Interior Detail, Exterior Wash, Clay Bar, Wax & Seal',
    },
    {
      description: '2023 Tesla Model 3 - Express Service',
      quantity: 1,
      unitPrice: 150.0,
      totalPrice: 150.0,
      date: '2025-01-15',
      orderNumber: 'SO-2025-002',
      stockNumber: 'TESLA2023M3001',
      vin: '5YJ3E1EA1PF123456',
      services: 'Express Wash, Interior Vacuum, Tire Shine',
    },
    {
      description: '2024 Mercedes-Benz GLE - Full Reconditioning',
      quantity: 1,
      unitPrice: 450.0,
      totalPrice: 450.0,
      date: '2025-01-16',
      orderNumber: 'RO-2025-001',
      stockNumber: 'MB2024GLE001',
      vin: '4JGDF7EE7PA123456',
      services: 'Complete Detail, Paint Correction, Ceramic Coating',
    },
    {
      description: '2023 Audi Q5 - Interior Deep Clean',
      quantity: 1,
      unitPrice: 200.0,
      totalPrice: 200.0,
      date: '2025-01-16',
      orderNumber: 'SO-2025-003',
      stockNumber: 'AUDI2023Q5001',
      vin: 'WA1BVAFV7P2123456',
      services: 'Interior Shampoo, Leather Conditioning, Odor Removal',
    },
    {
      description: '2024 Lexus RX 350 - Exterior Polish',
      quantity: 1,
      unitPrice: 175.0,
      totalPrice: 175.0,
      date: '2025-01-17',
      orderNumber: 'SO-2025-004',
      stockNumber: 'LEXUS2024RX001',
      vin: '2T2HZMDA9PC123456',
      services: 'Exterior Polish, Headlight Restoration',
    },
  ],

  // Totals
  subtotal: 1225.0,
  taxRate: 0.0625, // 6.25% MA sales tax
  taxAmount: 76.56,
  total: 1301.56,

  // Optional fields
  notes:
    'Thank you for your business! All services performed by certified detailing professionals.',
  terms: 'Payment due within 30 days. Late payments subject to 1.5% monthly interest.',
  department: 'Detail Service',
  serviceperiod: {
    start: new Date('2025-01-15'),
    end: new Date('2025-01-17'),
  },
};

/**
 * Sample payroll data
 */
const DEMO_PAYROLL: PayrollReportData = {
  employees: [
    {
      employeeId: 'E001',
      employeeName: 'John Doe',
      department: 'Detail',
      regularHours: 80.0,
      overtimeHours: 5.0,
      totalHours: 85.0,
      hourlyRate: 25.0,
      totalPay: 2187.5,
    },
    {
      employeeId: 'E002',
      employeeName: 'Jane Smith',
      department: 'Wash',
      regularHours: 75.0,
      overtimeHours: 2.5,
      totalHours: 77.5,
      hourlyRate: 22.0,
      totalPay: 1732.5,
    },
    {
      employeeId: 'E003',
      employeeName: 'Mike Johnson',
      department: 'Detail',
      regularHours: 80.0,
      overtimeHours: 8.0,
      totalHours: 88.0,
      hourlyRate: 28.0,
      totalPay: 2576.0,
    },
    {
      employeeId: 'E004',
      employeeName: 'Sarah Williams',
      department: 'Recon',
      regularHours: 70.0,
      overtimeHours: 0.0,
      totalHours: 70.0,
      hourlyRate: 30.0,
      totalPay: 2100.0,
    },
    {
      employeeId: 'E005',
      employeeName: 'Robert Brown',
      department: 'Detail',
      regularHours: 80.0,
      overtimeHours: 4.0,
      totalHours: 84.0,
      hourlyRate: 26.0,
      totalPay: 2236.0,
    },
  ],

  totals: {
    totalEmployees: 5,
    totalRegularHours: 385.0,
    totalOvertimeHours: 19.5,
    grandTotalHours: 404.5,
    totalPayroll: 10832.0,
  },

  period: {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  },
};

/**
 * Sample attendance data
 */
const DEMO_ATTENDANCE: AttendanceReportData = {
  records: [
    {
      employeeName: 'John Doe',
      date: new Date('2025-01-15'),
      clockIn: new Date('2025-01-15T08:00:00'),
      clockOut: new Date('2025-01-15T17:00:00'),
      totalHours: 8.0,
      status: 'present',
    },
    {
      employeeName: 'John Doe',
      date: new Date('2025-01-16'),
      clockIn: new Date('2025-01-16T08:15:00'),
      clockOut: new Date('2025-01-16T17:00:00'),
      totalHours: 7.75,
      status: 'late',
      notes: '15 minutes late - traffic',
    },
    {
      employeeName: 'John Doe',
      date: new Date('2025-01-17'),
      clockIn: new Date('2025-01-17T08:00:00'),
      clockOut: new Date('2025-01-17T17:00:00'),
      totalHours: 8.0,
      status: 'present',
    },
    {
      employeeName: 'Jane Smith',
      date: new Date('2025-01-15'),
      clockIn: new Date('2025-01-15T08:00:00'),
      clockOut: new Date('2025-01-15T17:00:00'),
      totalHours: 8.0,
      status: 'present',
    },
    {
      employeeName: 'Jane Smith',
      date: new Date('2025-01-16'),
      totalHours: 0.0,
      status: 'absent',
      notes: 'Sick day',
    },
    {
      employeeName: 'Jane Smith',
      date: new Date('2025-01-17'),
      clockIn: new Date('2025-01-17T08:00:00'),
      clockOut: new Date('2025-01-17T17:00:00'),
      totalHours: 8.0,
      status: 'present',
    },
  ],

  summary: {
    totalDays: 6,
    presentDays: 4,
    absentDays: 1,
    lateDays: 1,
    leaveDays: 0,
    attendanceRate: 0.833, // 83.3%
  },

  period: {
    start: new Date('2025-01-15'),
    end: new Date('2025-01-17'),
  },
};

// =====================================================
// DEMO FUNCTIONS
// =====================================================

/**
 * Demo 1: Generate sample invoice
 */
export async function demoInvoice(): Promise<void> {
  console.log('🔍 Generating demo invoice...');

  await downloadInvoicePDF({
    dealershipInfo: DEMO_DEALERSHIP,
    invoiceData: DEMO_INVOICE,
  });

  console.log('✅ Demo invoice generated: BMW_of_Sudbury_Invoice_INV-2025-001.pdf');
}

/**
 * Demo 2: Generate sample payroll report
 */
export async function demoPayrollReport(): Promise<void> {
  console.log('🔍 Generating demo payroll report...');

  const doc = await generatePayrollReportPDF(DEMO_DEALERSHIP, DEMO_PAYROLL);
  doc.save('DEMO_Payroll_Report_January_2025.pdf');

  console.log('✅ Demo payroll report generated');
}

/**
 * Demo 3: Generate sample attendance report
 */
export async function demoAttendanceReport(): Promise<void> {
  console.log('🔍 Generating demo attendance report...');

  const doc = await generateAttendanceReportPDF(DEMO_DEALERSHIP, DEMO_ATTENDANCE);
  doc.save('DEMO_Attendance_Report_January_2025.pdf');

  console.log('✅ Demo attendance report generated');
}

/**
 * Demo 4: Generate custom report
 */
export async function demoCustomReport(): Promise<void> {
  console.log('🔍 Generating demo custom report...');

  const doc = await generateReportPDF({
    dealershipInfo: DEMO_DEALERSHIP,
    metadata: {
      reportTitle: 'SALES PERFORMANCE SUMMARY',
      reportSubtitle: 'Top Performing Services',
      dateRange: {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      },
    },
    tables: [
      {
        columns: [
          { header: 'Service Name', dataKey: 'name', align: 'left', width: 70 },
          { header: 'Orders', dataKey: 'orders', align: 'center', width: 30, format: 'number' },
          {
            header: 'Revenue',
            dataKey: 'revenue',
            align: 'right',
            width: 40,
            format: 'currency',
            bold: true,
          },
          {
            header: 'Avg Order',
            dataKey: 'avgOrder',
            align: 'right',
            width: 40,
            format: 'currency',
          },
        ],
        rows: [
          { name: 'Premium Detail Package', orders: 45, revenue: 11250, avgOrder: 250 },
          { name: 'Interior Deep Clean', orders: 38, revenue: 7600, avgOrder: 200 },
          { name: 'Ceramic Coating', orders: 12, revenue: 5400, avgOrder: 450 },
          { name: 'Express Wash', orders: 85, revenue: 4250, avgOrder: 50 },
          { name: 'Paint Correction', orders: 15, revenue: 5250, avgOrder: 350 },
        ],
        footerRow: {
          name: 'TOTALS',
          orders: 195,
          revenue: 33750,
          avgOrder: 173.08,
        },
      },
    ],
    summaries: [
      {
        title: 'MONTHLY SUMMARY',
        items: [
          { label: 'Total Services', value: '195' },
          { label: 'Total Revenue', value: '$33,750.00', bold: true },
          { label: 'Avg Service Value', value: '$173.08' },
          { label: 'Top Service', value: 'Premium Detail' },
        ],
        position: 'right',
      },
    ],
    orientation: 'portrait',
  });

  doc.save('DEMO_Custom_Report_January_2025.pdf');

  console.log('✅ Demo custom report generated');
}

/**
 * Demo 5: Generate all sample PDFs
 */
export async function demoAll(): Promise<void> {
  console.log('🚀 Generating ALL demo PDFs...\n');

  await demoInvoice();
  await demoPayrollReport();
  await demoAttendanceReport();
  await demoCustomReport();

  console.log('\n✅ All demo PDFs generated successfully!');
  console.log('\nGenerated files:');
  console.log('  1. BMW_of_Sudbury_Invoice_INV-2025-001.pdf');
  console.log('  2. DEMO_Payroll_Report_January_2025.pdf');
  console.log('  3. DEMO_Attendance_Report_January_2025.pdf');
  console.log('  4. DEMO_Custom_Report_January_2025.pdf');
}

// =====================================================
// USAGE INSTRUCTIONS
// =====================================================

/*
USAGE IN A REACT COMPONENT:

import { demoAll, demoInvoice, demoPayrollReport } from '@/utils/pdfTemplates/__demo__';

function PDFDemoComponent() {
  return (
    <div>
      <h2>PDF Template Demos</h2>
      <button onClick={demoInvoice}>Generate Demo Invoice</button>
      <button onClick={demoPayrollReport}>Generate Demo Payroll</button>
      <button onClick={demoAll}>Generate All Demos</button>
    </div>
  );
}

USAGE IN BROWSER CONSOLE:

// Import the demo module
import { demoAll } from './utils/pdfTemplates/__demo__';

// Generate all demo PDFs
await demoAll();
*/
