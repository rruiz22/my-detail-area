import { Contact } from '@/hooks/useContacts';

/**
 * Exports contacts to CSV format
 */
export function exportContactsToCSV(contacts: Contact[], filename = 'contacts.csv'): void {
  // Define CSV headers
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Mobile Phone',
    'Position',
    'Department',
    'Vehicle',
    'License Plate',
    'Dealership',
    'Status',
    'Primary Contact',
    'Language',
    'Can Receive Notifications',
    'Created At',
  ];

  // Convert contacts to CSV rows
  const rows = contacts.map(contact => [
    contact.first_name || '',
    contact.last_name || '',
    contact.email || '',
    contact.phone || '',
    contact.mobile_phone || '',
    contact.position || '',
    contact.department || '',
    contact.vehicle || '',
    contact.plate || '',
    contact.dealership?.name || '',
    contact.status || '',
    contact.is_primary ? 'Yes' : 'No',
    contact.preferred_language || '',
    contact.can_receive_notifications ? 'Yes' : 'No',
    new Date(contact.created_at).toLocaleDateString(),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports contacts to Excel-compatible format (tab-separated values)
 */
export function exportContactsToExcel(contacts: Contact[], filename = 'contacts.xls'): void {
  // Define Excel headers
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Mobile Phone',
    'Position',
    'Department',
    'Vehicle',
    'License Plate',
    'Dealership',
    'Status',
    'Primary Contact',
    'Language',
    'Can Receive Notifications',
    'Created At',
    'Updated At',
  ];

  // Convert contacts to Excel rows
  const rows = contacts.map(contact => [
    contact.first_name || '',
    contact.last_name || '',
    contact.email || '',
    contact.phone || '',
    contact.mobile_phone || '',
    contact.position || '',
    contact.department || '',
    contact.vehicle || '',
    contact.plate || '',
    contact.dealership?.name || '',
    contact.status || '',
    contact.is_primary ? 'Yes' : 'No',
    contact.preferred_language || '',
    contact.can_receive_notifications ? 'Yes' : 'No',
    new Date(contact.created_at).toLocaleDateString(),
    new Date(contact.updated_at).toLocaleDateString(),
  ]);

  // Create HTML table for Excel
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Contacts</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Create and download the file
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parses CSV content and returns contacts data
 */
export function parseContactsCSV(csvContent: string): Partial<Contact>[] {
  const lines = csvContent.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Parse data rows
  const contacts: Partial<Contact>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

    const contact: Partial<Contact> = {
      first_name: values[0] || '',
      last_name: values[1] || '',
      email: values[2] || '',
      phone: values[3] || undefined,
      mobile_phone: values[4] || undefined,
      position: values[5] || undefined,
      department: (values[6] || 'other') as any,
      vehicle: values[7] || undefined,
      plate: values[8] || undefined,
      status: (values[10] || 'active') as any,
      is_primary: values[11]?.toLowerCase() === 'yes',
      preferred_language: values[12] || 'en',
      can_receive_notifications: values[13]?.toLowerCase() !== 'no',
    };

    contacts.push(contact);
  }

  return contacts;
}
