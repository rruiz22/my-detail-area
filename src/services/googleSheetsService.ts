/**
 * Google Sheets Service - Integración con API de Google Apps Script
 * Maneja la obtención de datos desde Google Sheets y conversión a órdenes de recon
 */

export interface GoogleSheetsRow {
  id?: string;
  vehicleVin?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  stockNumber?: string;
  reconCategory?: string;
  conditionGrade?: string;
  reconCost?: number;
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string;
  // Campos adicionales de tu Google Sheet
  [key: string]: any;
}

export interface GoogleSheetsResponse {
  data: GoogleSheetsRow[];
  success: boolean;
  error?: string;
  lastUpdated?: string;
}

export class GoogleSheetsService {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  /**
   * Obtener datos desde tu API de Google Script
   */
  async fetchData(): Promise<GoogleSheetsResponse> {
    try {
      console.log('🔄 Fetching data from Google Apps Script API...');

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Agregar cache busting para evitar cache del navegador
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Transformar los datos al formato esperado
      const transformedData = this.transformSheetData(rawData);

      console.log(`✅ Successfully fetched ${transformedData.length} records from Google Sheets`);

      return {
        data: transformedData,
        success: true,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error fetching Google Sheets data:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Transformar datos de tu Google Apps Script al formato interno
   */
  private transformSheetData(rawData: any): GoogleSheetsRow[] {
    // Manejar diferentes formatos de respuesta de Google Apps Script
    let dataArray: any[] = [];

    if (Array.isArray(rawData)) {
      dataArray = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      dataArray = rawData.data;
    } else if (rawData.values && Array.isArray(rawData.values)) {
      // Si viene en formato de matriz de valores
      return this.parseSheetValues(rawData.values);
    } else {
      console.warn('⚠️ Unexpected API response format:', rawData);
      return [];
    }

    return dataArray.map((row: any, index: number) => ({
      id: row.id || row.ID || `sheet-row-${index}`,
      vehicleVin: this.cleanString(row.vin || row.vehicleVin || row.VIN || row['VIN']),
      vehicleMake: this.cleanString(row.make || row.vehicleMake || row.Make || row['Marca']),
      vehicleModel: this.cleanString(row.model || row.vehicleModel || row.Model || row['Modelo']),
      vehicleYear: this.parseNumber(row.year || row.vehicleYear || row.Year || row['Año']),
      stockNumber: this.cleanString(row.stock || row.stockNumber || row.Stock || row['Stock']),
      reconCategory: this.cleanString(row.category || row.reconCategory || row.Category || row['Categoria']) || 'General',
      conditionGrade: this.cleanString(row.grade || row.conditionGrade || row.Grade || row['Grado']) || 'Good',
      reconCost: this.parseNumber(row.cost || row.reconCost || row.Cost || row['Costo']) || 0,
      notes: this.cleanString(row.notes || row.Notes || row['Notas'] || row['Observaciones']),
      priority: this.mapPriority(row.priority || row.Priority || row['Prioridad']),
      dueDate: this.parseDate(row.dueDate || row.due_date || row['Fecha Entrega'] || row['Due Date']),
      // Preservar todos los campos originales
      ...row
    }));
  }

  /**
   * Parsear valores cuando vienen como matriz (A1:Z format)
   */
  private parseSheetValues(values: any[][]): GoogleSheetsRow[] {
    if (values.length < 2) return [];

    const headers = values[0].map(h => String(h).trim());
    const dataRows = values.slice(1);

    return dataRows.map((row, index) => {
      const rowData: GoogleSheetsRow = {
        id: `sheet-row-${index}`
      };

      headers.forEach((header, colIndex) => {
        const value = row[colIndex];
        const normalizedHeader = this.normalizeHeader(header);

        switch (normalizedHeader) {
          case 'vin':
            rowData.vehicleVin = this.cleanString(value);
            break;
          case 'marca':
          case 'make':
            rowData.vehicleMake = this.cleanString(value);
            break;
          case 'modelo':
          case 'model':
            rowData.vehicleModel = this.cleanString(value);
            break;
          case 'año':
          case 'year':
            rowData.vehicleYear = this.parseNumber(value);
            break;
          case 'stock':
            rowData.stockNumber = this.cleanString(value);
            break;
          case 'categoria':
          case 'category':
            rowData.reconCategory = this.cleanString(value) || 'General';
            break;
          case 'grado':
          case 'grade':
            rowData.conditionGrade = this.cleanString(value) || 'Good';
            break;
          case 'costo':
          case 'cost':
            rowData.reconCost = this.parseNumber(value);
            break;
          case 'notas':
          case 'notes':
          case 'observaciones':
            rowData.notes = this.cleanString(value);
            break;
          case 'prioridad':
          case 'priority':
            rowData.priority = this.mapPriority(value);
            break;
          case 'fechaentrega':
          case 'duedate':
            rowData.dueDate = this.parseDate(value);
            break;
          default:
            (rowData as any)[normalizedHeader] = value;
        }
      });

      return rowData;
    });
  }

  /**
   * Utilities para limpiar y transformar datos
   */
  private cleanString(value: any): string {
    return value ? String(value).trim() : '';
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Remover símbolos de moneda y separadores de miles
    const cleanValue = String(value).replace(/[$,€]/g, '').trim();
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  private mapPriority(value: any): 'low' | 'normal' | 'high' | 'urgent' {
    if (!value) return 'normal';

    const priority = String(value).toLowerCase();
    if (priority.includes('urgent') || priority.includes('urgente')) return 'urgent';
    if (priority.includes('high') || priority.includes('alta')) return 'high';
    if (priority.includes('low') || priority.includes('baja')) return 'low';
    return 'normal';
  }

  private parseDate(value: any): string | undefined {
    if (!value) return undefined;

    try {
      // Manejar diferentes formatos de fecha
      let date: Date;

      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'string') {
        // Intentar parsear string de fecha
        date = new Date(value);
      } else if (typeof value === 'number') {
        // Manejar números de serie de Excel/Google Sheets
        // Google Sheets epoch: December 30, 1899
        date = new Date((value - 25569) * 86400 * 1000);
      } else {
        return undefined;
      }

      if (isNaN(date.getTime())) return undefined;

      return date.toISOString();
    } catch {
      return undefined;
    }
  }

  private normalizeHeader(header: string): string {
    return header.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/vehiculo|vehicle/i, '')
      .replace(/numero|number/i, '')
      .replace(/fecha|date/i, '');
  }

  /**
   * Convertir fila de Google Sheets a formato ReconOrder para la base de datos
   */
  convertToReconOrder(sheetRow: GoogleSheetsRow, dealerId: number = 5): any {
    const currentYear = new Date().getFullYear();
    const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días desde ahora

    return {
      vehicleVin: sheetRow.vehicleVin || '',
      vehicleMake: sheetRow.vehicleMake || '',
      vehicleModel: sheetRow.vehicleModel || '',
      vehicleYear: sheetRow.vehicleYear || currentYear,
      stockNumber: sheetRow.stockNumber || '',
      reconCategory: sheetRow.reconCategory || 'General',
      conditionGrade: sheetRow.conditionGrade || 'Good',
      reconCost: sheetRow.reconCost || 0,
      priority: sheetRow.priority || 'normal',
      dueDate: sheetRow.dueDate || defaultDueDate.toISOString(),
      notes: sheetRow.notes || '',
      status: 'pending',
      dealerId: dealerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// Instancia del servicio - usa tu URL de Google Apps Script
export const googleSheetsService = new GoogleSheetsService(
  // Coloca aquí la URL de tu Google Apps Script Web App
  import.meta.env.VITE_GOOGLE_SHEETS_API_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
);
