/**
 * CSV Processing Utilities
 * Provides intelligent CSV parsing with flexible column mapping and detailed debugging
 */

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  separator: string;
  detectedColumns: Record<string, string>;
  stats: {
    totalRows: number;
    validRows: number;
    emptyRows: number;
  };
}

export interface ProcessingLog {
  step: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface VehicleProcessingResult {
  vehicles: any[];
  logs: ProcessingLog[];
  stats: {
    processed: number;
    valid: number;
    invalid: number;
    missingRequired: number;
    missingOptional: number;
  };
}

// Common separators in order of likelihood
const SEPARATORS = ['\t', ',', '|', ';', ':'];

// Flexible column mapping - maps various column names to our standard fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
  year: ['year', 'año', 'model year', 'vehicle year', 'yr'],
  make: ['make', 'marca', 'manufacturer', 'mfg', 'brand'],
  model: ['model', 'modelo', 'vehicle model', 'model name'],
  trim: ['trim', 'trim level', 'trim_level', 'variant'],
  objective: ['objective', 'objetivo', 'sales status', 'inventory objective', 'status objective'],
  drivetrain: ['drivetrain', 'drive train', 'drive_train', 'transmission', 'trans'],
  segment: ['segment', 'category', 'type', 'class'],
  stock_number: ['stock number', 'stock_number', 'stocknumber', 'stock no', 'stock #', 'stock'],
  vin: ['vin', 'vehicle identification number', 'chassis'],
  color: ['color', 'colour', 'paint', 'exterior color', 'ext color'],
  mileage: ['mileage', 'miles', 'odometer', 'km', 'kilometers', 'milaje'],
  is_certified: ['certified', 'is_certified', 'cert', 'certification'],
  certified_program: ['certified program', 'cert program', 'certification program'],
  dms_status: ['dms status', 'status', 'inventory status', 'stock status'],
  age_days: ['age', 'age days', 'days in stock', 'inventory age', 'age_days', 'days'],
  price: ['price', 'asking price', 'retail price', 'selling price', 'precio'],
  msrp: ['msrp', 'list price', 'manufacturer price', 'suggested retail'],
  photo_count: ['photo count', 'photos', 'image count', 'pictures'],
  key_photo_url: ['key photo', 'main photo', 'primary photo', 'featured image'],
  leads_last_7_days: ['leads (last 7 days)', 'leads 7 days', 'recent leads', 'weekly leads'],
  leads_total: ['leads (all)', 'total leads', 'all leads', 'lifetime leads'],
  risk_light: ['risk light', 'risk', 'alert', 'flag', 'warning'],
  lot_location: ['lot location', 'location', 'lot', 'parking location']
};

/**
 * Detects the most likely separator used in CSV content
 */
export function detectSeparator(csvContent: string): string {
  const lines = csvContent.split('\n').filter(line => line.trim()).slice(0, 5);
  if (lines.length === 0) return ',';

  const separatorScores: Record<string, number> = {};

  for (const separator of SEPARATORS) {
    let score = 0;
    let consistency = 0;
    let firstLineCount = 0;

    lines.forEach((line, index) => {
      const parts = line.split(separator);
      
      if (index === 0) {
        firstLineCount = parts.length;
        // Bonus for having reasonable number of columns (5-50)
        if (parts.length >= 5 && parts.length <= 50) {
          score += 10;
        }
      } else {
        // Consistency bonus - same number of columns as header
        if (parts.length === firstLineCount) {
          consistency += 1;
        }
      }
      
      // Bonus for parts that look like headers or data
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
          score += 1;
          
          // Bonus for common header patterns
          if (index === 0 && /^[a-zA-Z][a-zA-Z\s()0-9]*$/.test(trimmed)) {
            score += 2;
          }
        }
      });
    });

    // Heavy bonus for consistency across all lines
    if (consistency === lines.length - 1) {
      score += 50;
    }

    separatorScores[separator] = score;
  }

  // Return separator with highest score
  const bestSeparator = Object.entries(separatorScores)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  return bestSeparator || ',';
}

/**
 * Maps a column header to our standard field name using flexible matching
 */
export function mapColumnToField(columnName: string): string | null {
  const normalized = columnName.toLowerCase().trim();
  
  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (variations.some(variation => 
      normalized === variation || 
      normalized.includes(variation) ||
      variation.includes(normalized)
    )) {
      return field;
    }
  }
  
  return null;
}

/**
 * Parses CSV content with intelligent separator detection and column mapping
 */
export function parseCSV(csvContent: string): CSVParseResult {
  const separator = detectSeparator(csvContent);
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = lines[0].split(separator).map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(separator).map(cell => cell.trim()));
  
  // Map detected columns to our standard fields
  const detectedColumns: Record<string, string> = {};
  headers.forEach(header => {
    const mappedField = mapColumnToField(header);
    if (mappedField) {
      detectedColumns[mappedField] = header;
    }
  });

  const stats = {
    totalRows: rows.length,
    validRows: rows.filter(row => row.some(cell => cell.length > 0)).length,
    emptyRows: rows.filter(row => row.every(cell => cell.length === 0)).length
  };

  return {
    headers,
    rows,
    separator,
    detectedColumns,
    stats
  };
}

/**
 * Extracts date and time information from filename
 */
export function extractFileTimestamp(filename: string): Date | null {
  // Common patterns: YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, timestamps, etc.
  const patterns = [
    /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/,  // MM-DD-YYYY or DD-MM-YYYY
    /(\d{4})(\d{2})(\d{2})/,    // YYYYMMDD
    /(\d{13})/,                 // Unix timestamp (milliseconds)
    /(\d{10})/                  // Unix timestamp (seconds)
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      try {
        if (match[0].length === 13) {
          // Unix timestamp in milliseconds
          return new Date(parseInt(match[0]));
        } else if (match[0].length === 10) {
          // Unix timestamp in seconds
          return new Date(parseInt(match[0]) * 1000);
        } else if (match.length === 4) {
          // Date components
          const [, part1, part2, part3] = match;
          
          // Try different date interpretations
          const attempts = [
            new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3)), // YYYY-MM-DD
            new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2)), // MM-DD-YYYY
            new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))  // DD-MM-YYYY
          ];
          
          for (const date of attempts) {
            if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
              return date;
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Processes vehicle data from parsed CSV with detailed logging
 */
export function processVehicleData(
  parseResult: CSVParseResult, 
  dealerId: number
): VehicleProcessingResult {
  const logs: ProcessingLog[] = [];
  const vehicles: any[] = [];
  
  const stats = {
    processed: 0,
    valid: 0,
    invalid: 0,
    missingRequired: 0,
    missingOptional: 0
  };

  const addLog = (step: string, message: string, data?: any) => {
    logs.push({ step, message, data, timestamp: new Date() });
  };

  addLog('start', `Starting processing of ${parseResult.rows.length} rows`);
  addLog('separator', `Detected separator: "${parseResult.separator}"`);
  addLog('columns', 'Detected column mappings', parseResult.detectedColumns);

  const { headers, rows, detectedColumns } = parseResult;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    stats.processed++;

    // Skip empty rows
    if (row.every(cell => !cell)) {
      addLog('skip', `Row ${i + 1}: Empty row`);
      continue;
    }

    const vehicle: any = {
      dealer_id: dealerId,
      is_active: true,
      raw_data: {}
    };

    let hasRequiredFields = 0;
    let hasMissingRequired = false;
    const modelParts: string[] = [];
    const trimParts: string[] = [];

    // Process each column
    headers.forEach((header, columnIndex) => {
      const value = row[columnIndex]?.trim();
      if (!value) return;

      const mappedField = mapColumnToField(header);
      
      if (mappedField) {
        // Process known fields
        switch (mappedField) {
          case 'year':
            const year = parseInt(value);
            if (!isNaN(year) && year > 1900 && year < 2100) {
              vehicle.year = year;
            }
            break;
          case 'make':
            vehicle.make = value;
            break;
          case 'model':
            vehicle.model = value;
            modelParts.push(value);
            break;
          case 'trim':
            vehicle.trim = value;
            trimParts.push(value);
            break;
          case 'objective':
            vehicle.objective = value;
            break;
          case 'drivetrain':
            vehicle.drivetrain = value;
            break;
          case 'segment':
            vehicle.segment = value;
            break;
          case 'stock_number':
            vehicle.stock_number = value;
            hasRequiredFields++;
            break;
          case 'vin':
            vehicle.vin = value.toUpperCase();
            hasRequiredFields++;
            break;
          case 'color':
            vehicle.color = value;
            break;
          case 'mileage':
            const mileage = parseInt(value.replace(/[^\d]/g, ''));
            if (!isNaN(mileage)) {
              vehicle.mileage = mileage;
            }
            break;
          case 'is_certified':
            vehicle.is_certified = ['yes', 'y', '1', 'true', 'certified'].includes(value.toLowerCase());
            break;
          case 'certified_program':
            vehicle.certified_program = value;
            break;
          case 'dms_status':
            vehicle.dms_status = value;
            break;
          case 'age_days':
            const age = parseInt(value.replace(/[^\d]/g, ''));
            if (!isNaN(age)) {
              vehicle.age_days = age;
            }
            break;
          case 'price':
            const price = parseFloat(value.replace(/[$,]/g, ''));
            if (!isNaN(price)) {
              vehicle.price = price;
            }
            break;
          case 'msrp':
            const msrp = parseFloat(value.replace(/[$,]/g, ''));
            if (!isNaN(msrp)) {
              vehicle.msrp = msrp;
            }
            break;
          case 'photo_count':
            const photoCount = parseInt(value);
            if (!isNaN(photoCount)) {
              vehicle.photo_count = photoCount;
            }
            break;
          case 'key_photo_url':
            vehicle.key_photo_url = value;
            break;
          case 'leads_last_7_days':
            const leads7 = parseInt(value);
            if (!isNaN(leads7)) {
              vehicle.leads_last_7_days = leads7;
            }
            break;
          case 'leads_total':
            const leadsTotal = parseInt(value);
            if (!isNaN(leadsTotal)) {
              vehicle.leads_total = leadsTotal;
            }
            break;
          case 'risk_light':
            vehicle.risk_light = value;
            break;
          case 'lot_location':
            vehicle.lot_location = value;
            break;
        }
      } else {
        // Store unmapped fields in raw_data
        vehicle.raw_data[header] = value;
      }
    });

    // Combine model and trim for full model name
    if (modelParts.length > 0 || trimParts.length > 0) {
      const combinedModel = [...modelParts, ...trimParts].filter(Boolean).join(' ');
      if (combinedModel) {
        vehicle.model = combinedModel;
      }
    }

    // Validate required fields
    if (hasRequiredFields >= 2) { // stock_number AND vin
      vehicles.push(vehicle);
      stats.valid++;
      addLog('success', `Row ${i + 1}: Valid vehicle processed`, {
        stock_number: vehicle.stock_number,
        vin: vehicle.vin
      });
    } else {
      stats.invalid++;
      hasMissingRequired = true;
      
      if (!vehicle.stock_number && !vehicle.vin) {
        stats.missingRequired++;
        addLog('error', `Row ${i + 1}: Missing both stock_number and VIN`);
      } else if (!vehicle.stock_number) {
        stats.missingRequired++;
        addLog('error', `Row ${i + 1}: Missing stock_number`, { vin: vehicle.vin });
      } else if (!vehicle.vin) {
        stats.missingRequired++;
        addLog('error', `Row ${i + 1}: Missing VIN`, { stock_number: vehicle.stock_number });
      }
    }
  }

  addLog('complete', `Processing complete: ${stats.valid} valid, ${stats.invalid} invalid vehicles`);

  return { vehicles, logs, stats };
}