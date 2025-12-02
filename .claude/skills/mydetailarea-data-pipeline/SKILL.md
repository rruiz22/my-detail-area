---
name: mydetailarea-data-pipeline
description: Data import/export and validation pipeline for MyDetailArea. Handles bulk operations, CSV/Excel processing, data migration, validation rules, error handling, and audit trails. Supports vehicle inventory import, order batch updates, contact imports, and custom data transformations. Use when implementing bulk data operations, migration from legacy systems, or scheduled exports.
license: MIT
---

# MyDetailArea Data Pipeline System

Robust data import/export pipeline with validation, error handling, and audit trails for bulk operations.

## Purpose

Provide safe, validated data import/export capabilities for dealership operations including vehicle inventory, contacts, orders, and bulk updates. All operations include validation, rollback capabilities, and comprehensive error reporting.

## When to Use

Use this skill when:
- Importing vehicle inventory from CSV/Excel
- Bulk updating order statuses or assignments
- Migrating data from legacy systems
- Exporting reports for external systems (accounting, analytics)
- Batch creating contacts or dealers
- Scheduled data exports for integrations
- Data transformation and cleanup operations

## Core Principles

1. **Validation First** - Never import invalid data
2. **Rollback Support** - All imports can be rolled back
3. **Error Reporting** - Clear, actionable error messages
4. **Audit Trail** - Track all data operations
5. **Performance** - Batch processing for large datasets
6. **Safety** - Preview before commit

## Data Import Workflow

### Step 1: Upload & Validation

```typescript
import { parse } from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportResult {
  valid: Row[];
  invalid: Array<{ row: number; errors: string[]; data: any }>;
  warnings: Array<{ row: number; warnings: string[]; data: any }>;
}

async function validateImport(file: File, schema: ValidationSchema): Promise<ImportResult> {
  // Parse file
  const data = await parseFile(file);

  const valid: Row[] = [];
  const invalid: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  data.forEach((row, index) => {
    const errors = validateRow(row, schema);
    const warns = checkWarnings(row, schema);

    if (errors.length > 0) {
      invalid.push({ row: index + 2, errors, data: row }); // +2 for header + 0-index
    } else {
      valid.push(row);
      if (warns.length > 0) {
        warnings.push({ row: index + 2, warnings: warns, data: row });
      }
    }
  });

  return { valid, invalid, warnings };
}
```

### Step 2: Preview & Confirmation

```typescript
function ImportPreview({ result }: { result: ImportResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Preview</CardTitle>
        <CardDescription>
          Review data before importing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Valid Rows"
            value={result.valid.length}
            iconColor="emerald"
          />
          <MetricCard
            label="Invalid Rows"
            value={result.invalid.length}
            iconColor="red"
          />
          <MetricCard
            label="Warnings"
            value={result.warnings.length}
            iconColor="amber"
          />
        </div>

        {/* Errors */}
        {result.invalid.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              Fix these errors before importing:
              <ul className="mt-2 space-y-1">
                {result.invalid.slice(0, 5).map(err => (
                  <li key={err.row}>
                    Row {err.row}: {err.errors.join(', ')}
                  </li>
                ))}
              </ul>
              {result.invalid.length > 5 && (
                <p className="mt-2">And {result.invalid.length - 5} more...</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <Alert>
            <AlertTitle>Warnings</AlertTitle>
            <AlertDescription>
              These rows have warnings but can be imported:
              <ul className="mt-2 space-y-1">
                {result.warnings.slice(0, 3).map(warn => (
                  <li key={warn.row}>
                    Row {warn.row}: {warn.warnings.join(', ')}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={downloadErrors}>
            Download Error Report
          </Button>
          <Button
            disabled={result.invalid.length > 0}
            onClick={() => proceedWithImport(result.valid)}
          >
            Import {result.valid.length} Rows
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Batch Processing

```typescript
async function batchImport(
  rows: Row[],
  batchSize: number = 100,
  onProgress?: (progress: number) => void
): Promise<ImportJobResult> {
  const batches = chunk(rows, batchSize);
  const results: BatchResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(batch)
        .select();

      if (error) throw error;

      successCount += batch.length;
      results.push({ batchIndex: i, success: true, count: batch.length });
    } catch (error) {
      failureCount += batch.length;
      results.push({ batchIndex: i, success: false, error: error.message });
    }

    // Report progress
    onProgress?.((i + 1) / batches.length * 100);
  }

  return {
    successCount,
    failureCount,
    batches: results,
    timestamp: new Date()
  };
}
```

## Validation Schemas

### Vehicle Import Schema

```typescript
const vehicleImportSchema = {
  vin: {
    required: true,
    validate: (value: string) => {
      if (!value) return 'VIN is required';
      if (value.length !== 17) return 'VIN must be 17 characters';
      if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(value)) return 'Invalid VIN format';
      return null;
    }
  },
  make: {
    required: true,
    validate: (value: string) => {
      if (!value) return 'Make is required';
      if (value.length > 50) return 'Make too long (max 50 chars)';
      return null;
    }
  },
  model: {
    required: true,
    validate: (value: string) => {
      if (!value) return 'Model is required';
      if (value.length > 50) return 'Model too long';
      return null;
    }
  },
  year: {
    required: true,
    validate: (value: number) => {
      const year = parseInt(value);
      if (isNaN(year)) return 'Year must be a number';
      if (year < 1900 || year > new Date().getFullYear() + 2) {
        return `Year must be between 1900 and ${new Date().getFullYear() + 2}`;
      }
      return null;
    }
  },
  price: {
    required: false,
    validate: (value: number) => {
      if (value && (isNaN(value) || value < 0)) {
        return 'Price must be a positive number';
      }
      return null;
    }
  },
  dealer_id: {
    required: true,
    validate: async (value: string) => {
      const { data } = await supabase
        .from('dealerships')
        .select('id')
        .eq('id', value)
        .single();

      if (!data) return 'Invalid dealer_id - dealership not found';
      return null;
    }
  }
};
```

### Contact Import Schema

```typescript
const contactImportSchema = {
  name: {
    required: true,
    validate: (value: string) => {
      if (!value) return 'Name is required';
      if (value.length > 100) return 'Name too long';
      return null;
    }
  },
  email: {
    required: false,
    validate: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Invalid email format';
      }
      return null;
    }
  },
  phone: {
    required: false,
    validate: (value: string) => {
      if (value && !/^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s()-]/g, ''))) {
        return 'Invalid phone format';
      }
      return null;
    }
  }
};
```

## Data Export

### CSV Export

```typescript
import Papa from 'papaparse';

async function exportToCSV(
  query: QueryConfig,
  filename: string
): Promise<void> {
  // Fetch data
  const { data } = await supabase
    .from(query.table)
    .select(query.columns.join(','))
    .gte('created_at', query.startDate)
    .lte('created_at', query.endDate);

  // Transform for export
  const exportData = data.map(row =>
    query.transform ? query.transform(row) : row
  );

  // Generate CSV
  const csv = Papa.unparse(exportData, {
    header: true,
    quotes: true
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
}
```

### Excel Export (Multi-Sheet)

```typescript
import * as XLSX from 'xlsx';

async function exportToExcel(
  sheets: Array<{ name: string; data: any[] }>,
  filename: string
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      )
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// Example usage
await exportToExcel([
  { name: 'Orders', data: ordersData },
  { name: 'Invoices', data: invoicesData },
  { name: 'Summary', data: summaryData }
], 'monthly_report');
```

## Scheduled Exports (Edge Function)

```typescript
// supabase/functions/scheduled-export/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Daily export of completed orders
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('completed_at', startOfDay.toISOString())
    .eq('status', 'completed');

  // Upload to storage
  const csv = generateCSV(orders);
  const filename = `exports/orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;

  await supabase.storage
    .from('exports')
    .upload(filename, new Blob([csv], { type: 'text/csv' }));

  // Notify admin
  await sendNotification({
    recipient_id: ADMIN_USER_ID,
    title: 'Daily Export Complete',
    message: `${orders.length} orders exported to ${filename}`
  });

  return new Response(JSON.stringify({ success: true, count: orders.length }));
});
```

## Audit Trail

```sql
-- Import/Export audit table
CREATE TABLE data_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL, -- 'import', 'export', 'bulk_update', 'bulk_delete'
  entity_type TEXT NOT NULL, -- 'vehicles', 'contacts', 'orders', etc.
  user_id UUID REFERENCES auth.users(id),
  dealer_id INTEGER REFERENCES dealerships(id),

  -- Operation details
  rows_processed INTEGER,
  rows_successful INTEGER,
  rows_failed INTEGER,

  -- Files
  source_file_name TEXT,
  source_file_url TEXT, -- Storage link
  error_report_url TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_operations_user ON data_operations(user_id, created_at DESC);
CREATE INDEX idx_data_operations_type ON data_operations(operation_type, entity_type);
```

## Error Reporting

```typescript
function generateErrorReport(errors: ValidationError[]): string {
  const header = ['Row', 'Field', 'Error', 'Value'];
  const rows = errors.flatMap(err =>
    err.errors.map(error => [
      err.row,
      error.field,
      error.message,
      JSON.stringify(err.data[error.field])
    ])
  );

  return Papa.unparse([header, ...rows]);
}

// Download error report
function downloadErrorReport(errors: ValidationError[]) {
  const csv = generateErrorReport(errors);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import_errors_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
  a.click();
}
```

## Rollback Support

```typescript
interface ImportJob {
  id: string;
  insertedIds: string[];
  timestamp: Date;
}

async function rollbackImport(jobId: string): Promise<void> {
  // Get job details
  const { data: job } = await supabase
    .from('data_operations')
    .select('metadata')
    .eq('id', jobId)
    .single();

  const insertedIds = job.metadata.inserted_ids;

  // Delete in batches
  const batches = chunk(insertedIds, 100);

  for (const batch of batches) {
    await supabase
      .from('vehicles')
      .delete()
      .in('id', batch);
  }

  // Update job status
  await supabase
    .from('data_operations')
    .update({ status: 'rolled_back', completed_at: new Date() })
    .eq('id', jobId);
}
```

## UI Components

### Import Wizard

```typescript
export function ImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Data</CardTitle>
        <Steps current={step}>
          <Step title="Upload" />
          <Step title="Validate" />
          <Step title="Preview" />
          <Step title="Import" />
        </Steps>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <FileUpload
            accept=".csv,.xlsx"
            onUpload={(file) => {
              setFile(file);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <ValidationStep
            file={file}
            onValidated={(result) => {
              setValidationResult(result);
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <PreviewStep
            result={validationResult}
            onConfirm={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <ImportStep
            data={validationResult.valid}
            onComplete={() => {
              toast.success('Import completed');
              setStep(1);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

## Best Practices

1. **Always Validate** - Never skip validation step
2. **Batch Processing** - Process large datasets in batches (100-500 rows)
3. **Error Reports** - Provide downloadable error reports
4. **Audit Trail** - Log all data operations
5. **Rollback Support** - Enable undo for imports
6. **Progress Feedback** - Show real-time progress
7. **Transaction Handling** - Use database transactions where possible
8. **File Size Limits** - Implement max file size (10MB recommended)
9. **Async Processing** - Use background jobs for large imports
10. **Permissions** - Verify user has permission for operation

## Reference Files

- **[Validation Rules](./references/validation-rules.md)** - All validation schemas
- **[Export Templates](./references/export-templates.md)** - Export configurations
- **[Import Examples](./references/import-examples.md)** - Sample CSV/Excel formats
