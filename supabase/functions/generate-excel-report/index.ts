import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import ExcelJS from "npm:exceljs@4.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  data: any[];
  filename: string;
  dealerId: number;
  reportType: 'get_ready' | 'stock_inventory' | 'generic';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ExportRequest = await req.json();
    const { data, filename, dealerId, reportType } = body;

    // Validate dealer membership
    const { data: membership, error: membershipError } = await supabaseClient
      .from('dealer_memberships')
      .select('dealer_id')
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Access denied: User not authorized for this dealership' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate data
    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data provided for export' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'My Detail Area';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.company = 'My Detail Area';

    // Add worksheet
    const worksheet = workbook.addWorksheet(reportType === 'get_ready' ? 'Vehicles' : 'Data');

    // Add row numbers to data
    const dataWithRowNumbers = data.map((row: any, index: number) => ({
      '#': index + 1,
      ...row
    }));

    // Get headers
    const headers = Object.keys(dataWithRowNumbers[0]);

    // Add header row with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' } // gray-200
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Add data rows
    dataWithRowNumbers.forEach((row: any) => {
      const dataRow = worksheet.addRow(headers.map(header => row[header]));
      dataRow.alignment = { vertical: 'middle' };
    });

    // Auto-fit columns (with min/max constraints)
    worksheet.columns.forEach((column, index) => {
      if (!column) return;

      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length : 10;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });

      // Set width with constraints (min: 8, max: 50)
      column.width = Math.min(Math.max(maxLength + 2, 8), 50);
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
      });
    });

    // Freeze header row
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}.xlsx`;

    // Return Excel file
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fullFilename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating Excel report:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
