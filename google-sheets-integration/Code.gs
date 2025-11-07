/**
 * ========================================
 * MYDETAILAREA - GET READY INTEGRATION
 * Google Apps Script Backend
 * ========================================
 *
 * This script enables automatic vehicle creation in MyDetailArea's
 * Get Ready module directly from Google Sheets.
 *
 * Features:
 * - Custom menu in Google Sheets
 * - Modal dialog for vehicle confirmation
 * - Direct API integration with Supabase
 * - Automatic status tracking in Sheet
 * - Comprehensive error handling
 * - Audit logging
 *
 * @version 1.0.0
 * @author MyDetailArea Team
 */

// ========================================
// CONFIGURATION
// ========================================

/**
 * Get configuration - HARDCODED VERSION
 *
 * ⚠️ IMPORTANT: Update these values for your setup
 */
function getConfig() {
  // ✅ HARDCODED CONFIGURATION (No Script Properties needed)
  return {
    SUPABASE_URL: 'https://swfnnrpzpkdypbrzmgnr.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY',
    DEALER_ID: '5',
    SHEET_NAME: 'PRE-OWNED INVENTORY2',
    AUTO_ADD_ENABLED: false,
    DEFAULT_PRIORITY: 'medium',
    DEFAULT_WORKFLOW: 'standard'
  };
}

/**
 * Validate that configuration is properly set
 */
function validateConfig() {
  const config = getConfig();

  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DEALER_ID'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing configuration: ${missing.join(', ')}\n\nPlease configure in: Extensions → Apps Script → Project Settings → Script Properties`);
  }

  return config;
}

/**
 * Gets the configured sheet by name
 * @returns {Sheet} The target sheet
 * @throws {Error} If sheet doesn't exist
 */
function getTargetSheet() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(config.SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${config.SHEET_NAME}" not found. Please check SHEET_NAME in Script Properties.\n\nAvailable sheets: ${ss.getSheets().map(s => s.getName()).join(', ')}`);
  }

  return sheet;
}

// ========================================
// MENU INITIALIZATION
// ========================================

/**
 * Creates custom menu when spreadsheet opens
 * Adds "Get Ready" menu with options
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🚗 Get Ready')
    .addItem('📤 Send Selected Vehicle', 'showSendToGetReadyDialog')
    .addItem('📤 Send All Unmarked Vehicles', 'sendAllUnmarkedVehicles')
    .addSeparator()
    .addItem('⚙️ Settings', 'showSettingsDialog')
    .addItem('📊 View Logs', 'showLogsSheet')
    .addSeparator()
    .addItem('ℹ️ About', 'showAboutDialog')
    .addToUi();

  Logger.log('Get Ready menu initialized');
}

/**
 * Runs when script is first installed
 * One-time authorization prompt
 */
function onInstall(e) {
  onOpen(e);

  SpreadsheetApp.getUi().alert(
    '✅ MyDetailArea Get Ready Integration Installed!\n\n' +
    'Next steps:\n' +
    '1. Configure Script Properties (see Setup Guide)\n' +
    '2. Use menu: 🚗 Get Ready → 📤 Send Selected Vehicle\n\n' +
    'For help, see menu: 🚗 Get Ready → ℹ️ About'
  );
}

// ========================================
// DATA EXTRACTION
// ========================================

/**
 * Gets data from the currently selected row
 * @returns {Object} Vehicle data from sheet
 */
function getSelectedRowData() {
  const sheet = getTargetSheet();
  const activeRange = sheet.getActiveRange();
  const row = activeRange.getRow();

  // Check if valid row selected (not header)
  if (row <= 1) {
    throw new Error('Please select a vehicle row (not the header row)');
  }

  // Column mapping:
  // A = Stock Number (column 1)
  // L = Year (column 12)
  // M = Make (column 13)
  // N = Model (column 14)
  const stockNumber = sheet.getRange(row, 1).getValue(); // Column A
  const year = sheet.getRange(row, 12).getValue(); // Column L
  const make = sheet.getRange(row, 13).getValue(); // Column M
  const model = sheet.getRange(row, 14).getValue(); // Column N

  const data = {
    stock_number: (stockNumber || '').toString().trim().toUpperCase(),
    vehicle_year: parseInt(year) || new Date().getFullYear(),
    vehicle_make: (make || '').toString().trim().toUpperCase(),
    vehicle_model: (model || '').toString().trim().toUpperCase(),
    rowNumber: row,
    sheetName: sheet.getName()
  };

  // Validation
  if (!data.stock_number) {
    throw new Error('Stock number (Column A) is empty. Please fill in the stock number first.');
  }

  return data;
}

/**
 * Gets all rows that haven't been added yet (no status in column E)
 * @returns {Array} Array of vehicle data objects
 */
function getAllUnmarkedVehicles() {
  const sheet = getTargetSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  // Get all data from row 2 to last row
  // We need columns: A (stock), Q (status), L (year), M (make), N (model)
  const vehicles = [];

  for (let i = 2; i <= lastRow; i++) {
    const stockNumber = sheet.getRange(i, 1).getValue(); // Column A
    const status = sheet.getRange(i, 17).getValue(); // Column Q (consolidated status)
    const year = sheet.getRange(i, 12).getValue(); // Column L
    const make = sheet.getRange(i, 13).getValue(); // Column M
    const model = sheet.getRange(i, 14).getValue(); // Column N

    // Only include rows with stock number and no "Added" status
    if (stockNumber && stockNumber.toString().trim() !== '' &&
        (!status || !status.toString().includes('Added to Get Ready'))) {
      vehicles.push({
        stock_number: stockNumber.toString().trim().toUpperCase(),
        vehicle_year: parseInt(year) || new Date().getFullYear(),
        vehicle_make: (make || '').toString().trim().toUpperCase(),
        vehicle_model: (model || '').toString().trim().toUpperCase(),
        rowNumber: i,
        sheetName: sheet.getName()
      });
    }
  }

  return vehicles;
}

// ========================================
// SUPABASE API INTEGRATION
// ========================================

/**
 * Fetches Get Ready workflow steps from Supabase
 * @returns {Array} Array of step objects {id, name, color, order_index}
 */
function getGetReadySteps() {
  Logger.log('=== getGetReadySteps() called ===');

  try {
    const config = getConfig();
    Logger.log('Config loaded successfully');
    Logger.log('Dealer ID: ' + config.DEALER_ID);
    Logger.log('Supabase URL: ' + config.SUPABASE_URL);

    const url = `${config.SUPABASE_URL}/rest/v1/get_ready_steps?dealer_id=eq.${config.DEALER_ID}&is_active=eq.true&order=order_index.asc&select=id,name,color,order_index`;

    const options = {
      'method': 'get',
      'headers': {
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      'muteHttpExceptions': true
    };

    Logger.log('Fetching from URL: ' + url);

    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('HTTP Status: ' + code);

    if (code !== 200) {
      Logger.log('ERROR Response: ' + responseText);
      throw new Error(`API returned ${code}: ${responseText}`);
    }

    const steps = JSON.parse(responseText);
    Logger.log('Parsed ' + steps.length + ' steps successfully');

    // Ensure we return a valid array
    if (!Array.isArray(steps)) {
      Logger.log('WARNING: steps is not an array, converting...');
      return [steps];
    }

    // Return only active steps
    const activeSteps = steps.filter(s => s.is_active !== false);
    Logger.log('Returning ' + activeSteps.length + ' active steps');

    return activeSteps;

  } catch (error) {
    Logger.log('EXCEPTION in getGetReadySteps: ' + error.message);
    Logger.log('Stack: ' + error.stack);

    // Return actual steps as fallback (correct IDs from database)
    return [
      { id: 'inspection', name: 'Dispatch', color: '#3B82F6', order_index: 1 },
      { id: 'detailing', name: 'Detailing', color: '#10B981', order_index: 2 },
      { id: '5_detail_done', name: 'Detail Done', color: '#F59E0B', order_index: 3 },
      { id: 'mechanical', name: 'Mechanical', color: '#EF4444', order_index: 4 },
      { id: 'body_work', name: 'Body Work', color: '#8B5CF6', order_index: 5 },
      { id: 'ready', name: 'Front Line', color: '#10B981', order_index: 6 }
    ];
  }
}

/**
 * Creates a vehicle in MyDetailArea Get Ready module
 * @param {Object} vehicleData - Vehicle data including stock, year, make, model
 * @returns {Object} Result object with success status and details
 */
function createVehicleInGetReady(vehicleData) {
  try {
    const config = validateConfig();

    // Validate required fields
    validateVehicleData(vehicleData);

    const url = `${config.SUPABASE_URL}/rest/v1/get_ready_vehicles`;

    // Prepare payload
    const payload = {
      dealer_id: parseInt(config.DEALER_ID),
      stock_number: vehicleData.stock_number.toUpperCase().replace(/\s+/g, ''),
      vehicle_year: parseInt(vehicleData.vehicle_year),
      vehicle_make: vehicleData.vehicle_make.toUpperCase(),
      vehicle_model: vehicleData.vehicle_model.toUpperCase(),
      vehicle_trim: vehicleData.vehicle_trim ? vehicleData.vehicle_trim.toUpperCase() : '',
      vin: vehicleData.vin ? vehicleData.vin.toUpperCase().replace(/\s+/g, '') : '',
      priority: vehicleData.priority || config.DEFAULT_PRIORITY,
      workflow_type: config.DEFAULT_WORKFLOW,
      status: 'in_progress',
      step_id: vehicleData.step_id || null,
      notes: `Imported from Google Sheets on ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}\nSheet: ${vehicleData.sheetName || 'Unknown'}\nRow: ${vehicleData.rowNumber || 'Unknown'}`
    };

    const options = {
      'method': 'post',
      'headers': {
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    Logger.log('Creating vehicle in Get Ready: ' + payload.stock_number);

    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const responseText = response.getContentText();

    if (code !== 201) {
      const errorData = JSON.parse(responseText);

      // Handle duplicate stock number
      if (errorData.code === '23505' && responseText.includes('stock_number')) {
        throw new Error(`Vehicle with stock number "${payload.stock_number}" already exists in Get Ready`);
      }

      throw new Error(`Failed to create vehicle (${code}): ${errorData.message || responseText}`);
    }

    const result = JSON.parse(responseText);
    const createdVehicle = Array.isArray(result) ? result[0] : result;

    // Mark row in Google Sheet as "Added"
    if (vehicleData.rowNumber) {
      markRowAsAdded(vehicleData.rowNumber, createdVehicle.id);
    }

    // Log success
    logVehicleCreation(vehicleData, true, null, createdVehicle.id);

    return {
      success: true,
      vehicle: createdVehicle,
      message: `Vehicle ${payload.stock_number} successfully added to Get Ready!`
    };

  } catch (error) {
    Logger.log('Error creating vehicle: ' + error.message);
    logVehicleCreation(vehicleData, false, error.message, null);

    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

/**
 * Validates vehicle data before sending to API
 * @param {Object} data - Vehicle data to validate
 * @throws {Error} If validation fails
 */
function validateVehicleData(data) {
  const errors = [];

  // Stock number required
  if (!data.stock_number || data.stock_number.trim() === '') {
    errors.push('Stock number is required');
  }

  // Stock number format (alphanumeric, max 20 chars)
  if (data.stock_number && !/^[A-Z0-9]{1,20}$/i.test(data.stock_number)) {
    errors.push('Stock number must be alphanumeric, max 20 characters');
  }

  // Year validation
  const currentYear = new Date().getFullYear();
  if (!data.vehicle_year || isNaN(data.vehicle_year)) {
    errors.push('Vehicle year is required and must be a number');
  } else if (data.vehicle_year < 1900 || data.vehicle_year > currentYear + 2) {
    errors.push(`Vehicle year must be between 1900 and ${currentYear + 2}`);
  }

  // Make required
  if (!data.vehicle_make || data.vehicle_make.trim() === '') {
    errors.push('Vehicle make is required');
  }

  // Model required
  if (!data.vehicle_model || data.vehicle_model.trim() === '') {
    errors.push('Vehicle model is required');
  }

  // VIN validation (if provided)
  if (data.vin && data.vin.trim() !== '') {
    const cleanVin = data.vin.replace(/\s+/g, '');
    if (cleanVin.length !== 17) {
      errors.push('VIN must be exactly 17 characters (if provided)');
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(cleanVin)) {
      errors.push('VIN contains invalid characters (no I, O, Q allowed)');
    }
  }

  if (errors.length > 0) {
    throw new Error('Validation failed:\n\n' + errors.join('\n'));
  }

  return true;
}

// ========================================
// SHEET MANIPULATION
// ========================================

/**
 * Marks a row as "Added to Get Ready" in column Q
 * @param {number} rowNumber - Row number to update
 * @param {string} vehicleId - UUID of created vehicle
 */
function markRowAsAdded(rowNumber, vehicleId) {
  try {
    const sheet = getTargetSheet();
    const statusCol = 17; // Column Q for consolidated status

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const sheetName = sheet.getName();

    // Consolidated format with sheet name
    const statusText = `✅ Added to Get Ready\n📄 Sheet: ${sheetName}\n🕐 ${timestamp}\n🆔 ID: ${vehicleId}`;

    sheet.getRange(rowNumber, statusCol).setValue(statusText);

    // Optional: Set text wrapping and vertical alignment for better display
    const cell = sheet.getRange(rowNumber, statusCol);
    cell.setWrap(true);
    cell.setVerticalAlignment('top');
    cell.setFontSize(9);

    Logger.log(`Row ${rowNumber} marked as added in column Q`);
  } catch (error) {
    Logger.log('Error marking row: ' + error.message);
    // Don't throw - this is not critical
  }
}

// ========================================
// LOGGING & AUDIT
// ========================================

/**
 * Logs vehicle creation attempt to "API Logs" sheet
 * @param {Object} vehicle - Vehicle data
 * @param {boolean} success - Whether creation succeeded
 * @param {string} error - Error message if failed
 * @param {string} vehicleId - UUID if succeeded
 */
function logVehicleCreation(vehicle, success, error, vehicleId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('API Logs');

    // Create logs sheet if doesn't exist
    if (!logSheet) {
      logSheet = ss.insertSheet('API Logs');

      // Add header row
      logSheet.appendRow([
        'Timestamp',
        'Stock Number',
        'Year',
        'Make',
        'Model',
        'Success',
        'Vehicle ID',
        'Error',
        'Row #'
      ]);

      // Format header
      const headerRange = logSheet.getRange(1, 1, 1, 9);
      headerRange.setBackground('#f3f4f6');
      headerRange.setFontWeight('bold');
      logSheet.setFrozenRows(1);
    }

    // Append log entry
    logSheet.appendRow([
      new Date(),
      vehicle.stock_number || '',
      vehicle.vehicle_year || '',
      vehicle.vehicle_make || '',
      vehicle.vehicle_model || '',
      success ? 'Yes' : 'No',
      vehicleId || '',
      error || '',
      vehicle.rowNumber || ''
    ]);

    // Auto-size columns (only first time or periodically)
    if (logSheet.getLastRow() <= 10) {
      logSheet.autoResizeColumns(1, 9);
    }

  } catch (e) {
    Logger.log('Error writing to log sheet: ' + e.message);
    // Don't throw - logging failure shouldn't break main flow
  }
}

// ========================================
// DIALOG DISPLAYS
// ========================================

/**
 * Shows the modal dialog to send vehicle to Get Ready
 */
function showSendToGetReadyDialog() {
  try {
    // Validate config first
    validateConfig();

    const html = HtmlService.createHtmlOutputFromFile('SendToGetReadyDialog')
      .setWidth(550)
      .setHeight(650);

    SpreadsheetApp.getUi().showModalDialog(html, '🚗 Add Vehicle to Get Ready');

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Shows settings dialog for configuration
 */
function showSettingsDialog() {
  const ui = SpreadsheetApp.getUi();
  const config = getConfig();

  const message = `
Current Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supabase URL: ${config.SUPABASE_URL || '❌ Not set'}
Dealer ID: ${config.DEALER_ID || '❌ Not set'}
API Key: ${config.SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Not set'}
Sheet Name: ${config.SHEET_NAME || 'Sheet1 (default)'}

Default Priority: ${config.DEFAULT_PRIORITY}
Default Workflow: ${config.DEFAULT_WORKFLOW}
Auto-add Enabled: ${config.AUTO_ADD_ENABLED ? 'Yes' : 'No'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To change settings:
1. Extensions → Apps Script
2. Project Settings → Script Properties
3. Add/Edit properties

For help, see SETUP_GUIDE.md
  `.trim();

  ui.alert('⚙️ Integration Settings', message, ui.ButtonSet.OK);
}

/**
 * Shows about dialog with info and links
 */
function showAboutDialog() {
  const ui = SpreadsheetApp.getUi();

  const message = `
MyDetailArea - Get Ready Integration
Version: 1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This integration automatically syncs vehicles
from Google Sheets to MyDetailArea's Get Ready
module for workflow tracking.

Features:
✅ One-click vehicle creation
✅ Modal confirmation dialog
✅ Automatic status tracking
✅ Comprehensive logging

Documentation:
📖 Setup Guide - See SETUP_GUIDE.md
📖 User Guide - See USER_GUIDE.md

Support:
📧 Contact: support@mydetailarea.com
🌐 Website: mydetailarea.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  ui.alert('ℹ️ About', message, ui.ButtonSet.OK);
}

/**
 * Navigates to API Logs sheet (creates if doesn't exist)
 */
function showLogsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('API Logs');

  if (!logSheet) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('No logs yet', 'No API logs have been created yet. Logs will appear here after you send your first vehicle.', ui.ButtonSet.OK);
    return;
  }

  ss.setActiveSheet(logSheet);
}

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * Sends all unmarked vehicles to Get Ready
 * Shows confirmation dialog first
 */
function sendAllUnmarkedVehicles() {
  const ui = SpreadsheetApp.getUi();

  try {
    validateConfig();

    const vehicles = getAllUnmarkedVehicles();

    if (vehicles.length === 0) {
      ui.alert('No vehicles to send', 'All vehicles have already been added to Get Ready, or there are no vehicles in the sheet.', ui.ButtonSet.OK);
      return;
    }

    const result = ui.alert(
      'Send Multiple Vehicles',
      `Found ${vehicles.length} unmarked vehicle(s).\n\nDo you want to add all of them to Get Ready?\n\nThis action will create ${vehicles.length} new vehicle(s).`,
      ui.ButtonSet.YES_NO
    );

    if (result !== ui.Button.YES) {
      return;
    }

    // Show progress toast
    const toast = SpreadsheetApp.getActiveSpreadsheet();
    toast.toast('Processing vehicles...', '🚗 Get Ready', -1); // -1 = no timeout

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each vehicle
    vehicles.forEach((vehicle, index) => {
      toast.toast(`Processing ${index + 1} of ${vehicles.length}...`, '🚗 Get Ready', -1);

      const result = createVehicleInGetReady({
        ...vehicle,
        step_id: null, // Use default first step
        priority: 'medium' // Use default priority for bulk
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`Row ${vehicle.rowNumber}: ${result.error}`);
      }

      // Rate limiting: wait 100ms between requests
      Utilities.sleep(100);
    });

    // Hide toast
    toast.toast('Complete!', '🚗 Get Ready', 3);

    // Show summary
    let summary = `✅ Successfully added: ${successCount} vehicle(s)`;
    if (errorCount > 0) {
      summary += `\n❌ Failed: ${errorCount} vehicle(s)\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
      if (errors.length > 5) {
        summary += `\n\n... and ${errors.length - 5} more. Check API Logs for details.`;
      }
    }

    ui.alert('Bulk Import Complete', summary, ui.ButtonSet.OK);

  } catch (error) {
    ui.alert('Error', error.message, ui.ButtonSet.OK);
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Tests the Supabase API connection
 * Run this manually to verify setup
 */
function testSupabaseConnection() {
  const ui = SpreadsheetApp.getUi();

  try {
    const config = validateConfig();

    // Test 1: Fetch steps
    ui.alert('Test 1/2', 'Testing connection to Supabase...', ui.ButtonSet.OK);
    const steps = getGetReadySteps();

    if (!steps || steps.length === 0) {
      throw new Error('No steps found. Make sure your dealership has workflow steps configured in Get Ready.');
    }

    ui.alert(
      '✅ Connection Test Successful',
      `Successfully connected to Supabase!\n\nFound ${steps.length} workflow step(s):\n${steps.map(s => `• ${s.name}`).join('\n')}\n\nYou're ready to start sending vehicles!`,
      ui.ButtonSet.OK
    );

  } catch (error) {
    ui.alert('❌ Connection Test Failed', error.message, ui.ButtonSet.OK);
  }
}

/**
 * Clears the steps cache
 * Useful after adding/modifying steps in Get Ready
 */
function clearStepsCache() {
  const config = getConfig();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'get_ready_steps_' + config.DEALER_ID;
  cache.remove(cacheKey);

  SpreadsheetApp.getUi().alert('Cache cleared', 'Steps cache has been cleared. Next request will fetch fresh data from Supabase.', SpreadsheetApp.getUi().ButtonSet.OK);
}
