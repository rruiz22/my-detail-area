/**
 * Kiosk Diagnostic Utilities
 *
 * Comprehensive troubleshooting tools for kiosk configuration issues.
 * Run these functions in the browser console to diagnose problems.
 *
 * Usage (in browser console):
 * ```javascript
 * import { diagnoseKioskConfig } from '@/utils/kioskDiagnostics';
 * await diagnoseKioskConfig();
 * ```
 */

import { supabase } from '@/integrations/supabase/client';

const KIOSK_ID_KEY = 'kiosk_id';
const KIOSK_FINGERPRINT_KEY = 'kiosk_device_fingerprint';
const KIOSK_CONFIGURED_AT_KEY = 'kiosk_configured_at';
const KIOSK_USERNAME_KEY = 'kiosk_username';

interface DiagnosticReport {
  timestamp: string;
  localStorage: {
    kioskId: string | null;
    fingerprint: string | null;
    configuredAt: string | null;
    username: string | null;
    isValid: boolean;
    issues: string[];
  };
  database: {
    kioskExists: boolean;
    deviceBindingExists: boolean;
    kioskData: any;
    deviceData: any;
    issues: string[];
  };
  recommendations: string[];
  severity: 'ok' | 'warning' | 'critical';
}

/**
 * Full diagnostic check of kiosk configuration
 * @returns Detailed diagnostic report
 */
export async function diagnoseKioskConfig(): Promise<DiagnosticReport> {
  console.log('🔍 Starting Kiosk Configuration Diagnostic...');

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    localStorage: {
      kioskId: null,
      fingerprint: null,
      configuredAt: null,
      username: null,
      isValid: false,
      issues: []
    },
    database: {
      kioskExists: false,
      deviceBindingExists: false,
      kioskData: null,
      deviceData: null,
      issues: []
    },
    recommendations: [],
    severity: 'ok'
  };

  // ===== STEP 1: Check localStorage =====
  console.log('📦 Checking localStorage...');

  const kioskId = localStorage.getItem(KIOSK_ID_KEY);
  const fingerprint = localStorage.getItem(KIOSK_FINGERPRINT_KEY);
  const configuredAt = localStorage.getItem(KIOSK_CONFIGURED_AT_KEY);
  const username = localStorage.getItem(KIOSK_USERNAME_KEY);

  report.localStorage.kioskId = kioskId;
  report.localStorage.fingerprint = fingerprint;
  report.localStorage.configuredAt = configuredAt;
  report.localStorage.username = username;

  // Validate localStorage
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!kioskId) {
    report.localStorage.issues.push('❌ No kiosk_id found in localStorage');
  } else if (kioskId === 'default-kiosk') {
    report.localStorage.issues.push('❌ Legacy default-kiosk fallback detected');
  } else if (!uuidRegex.test(kioskId)) {
    report.localStorage.issues.push(`❌ Invalid UUID format: ${kioskId}`);
  }

  if (!fingerprint) {
    report.localStorage.issues.push('⚠️ No device fingerprint found');
  }

  if (!configuredAt) {
    report.localStorage.issues.push('ℹ️ No configuration timestamp');
  }

  report.localStorage.isValid = kioskId !== null && uuidRegex.test(kioskId) && fingerprint !== null;

  // ===== STEP 2: Check Database =====
  console.log('🗄️ Checking database...');

  // Check if kiosk exists in detail_hub_kiosks table
  if (kioskId && uuidRegex.test(kioskId)) {
    const { data: kioskData, error: kioskError } = await supabase
      .from('detail_hub_kiosks')
      .select('*')
      .eq('id', kioskId)
      .single();

    if (kioskError || !kioskData) {
      report.database.issues.push(`❌ Kiosk UUID not found in database: ${kioskId}`);
      report.database.kioskExists = false;
    } else {
      report.database.kioskExists = true;
      report.database.kioskData = kioskData;
      console.log('✅ Kiosk found in database:', kioskData.name);
    }
  }

  // Check if device binding exists in detail_hub_kiosk_devices table
  if (fingerprint) {
    const { data: deviceData, error: deviceError } = await supabase
      .from('detail_hub_kiosk_devices')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .single();

    if (deviceError || !deviceData) {
      report.database.issues.push('⚠️ No device binding found in database');
      report.database.deviceBindingExists = false;
    } else {
      report.database.deviceBindingExists = true;
      report.database.deviceData = deviceData;
      console.log('✅ Device binding found in database');

      // Check if binding matches localStorage
      if (deviceData.kiosk_id !== kioskId) {
        report.database.issues.push(
          `⚠️ Database kiosk_id (${deviceData.kiosk_id}) doesn't match localStorage (${kioskId})`
        );
      }
    }
  }

  // ===== STEP 3: Generate Recommendations =====
  if (report.localStorage.issues.length === 0 && report.database.issues.length === 0) {
    report.severity = 'ok';
    report.recommendations.push('✅ Everything looks good!');
  } else if (!kioskId && report.database.deviceBindingExists) {
    report.severity = 'warning';
    report.recommendations.push('🔄 localStorage is empty but device binding exists');
    report.recommendations.push('💡 Automatic recovery should restore configuration on next page load');
  } else if (kioskId && !report.database.kioskExists) {
    report.severity = 'critical';
    report.recommendations.push('🚨 Kiosk was deleted from database (possibly via CASCADE when dealership was deleted)');
    report.recommendations.push('💡 Solution: Reconfigure kiosk or restore database record');
  } else if (kioskId && !report.database.deviceBindingExists) {
    report.severity = 'warning';
    report.recommendations.push('⚠️ Device binding missing in database');
    report.recommendations.push('💡 Solution: Reconfigure kiosk to create device binding');
  } else {
    report.severity = 'critical';
    report.recommendations.push('🚨 Configuration is corrupted');
    report.recommendations.push('💡 Solution: Clear localStorage and reconfigure kiosk');
  }

  // ===== STEP 4: Log Report =====
  console.log('📊 Diagnostic Report:', report);
  console.table({
    'localStorage Valid': report.localStorage.isValid,
    'Kiosk Exists in DB': report.database.kioskExists,
    'Device Binding Exists': report.database.deviceBindingExists,
    'Severity': report.severity
  });

  if (report.localStorage.issues.length > 0) {
    console.log('❌ localStorage Issues:', report.localStorage.issues);
  }

  if (report.database.issues.length > 0) {
    console.log('❌ Database Issues:', report.database.issues);
  }

  console.log('💡 Recommendations:', report.recommendations);

  return report;
}

/**
 * Force clear all kiosk configuration (nuclear option)
 */
export function forceResetKioskConfig(): void {
  console.warn('🔥 FORCE RESETTING KIOSK CONFIGURATION...');

  localStorage.removeItem(KIOSK_ID_KEY);
  localStorage.removeItem(KIOSK_FINGERPRINT_KEY);
  localStorage.removeItem(KIOSK_CONFIGURED_AT_KEY);
  localStorage.removeItem(KIOSK_USERNAME_KEY);

  console.log('✅ All kiosk configuration cleared from localStorage');
  console.log('💡 Reload page to reconfigure kiosk');
}

/**
 * Display current kiosk configuration in a readable format
 */
export function showKioskConfig(): void {
  const kioskId = localStorage.getItem(KIOSK_ID_KEY);
  const fingerprint = localStorage.getItem(KIOSK_FINGERPRINT_KEY);
  const configuredAt = localStorage.getItem(KIOSK_CONFIGURED_AT_KEY);
  const username = localStorage.getItem(KIOSK_USERNAME_KEY);

  console.log('📦 Current Kiosk Configuration:');
  console.table({
    'Kiosk ID': kioskId || '(not configured)',
    'Device Fingerprint': fingerprint ? fingerprint.substring(0, 12) + '...' : '(not set)',
    'Configured At': configuredAt || '(unknown)',
    'Username': username || '(unknown)',
    'Age (days)': configuredAt
      ? Math.floor((Date.now() - new Date(configuredAt).getTime()) / (1000 * 60 * 60 * 24))
      : 'N/A'
  });
}

/**
 * Check if automatic recovery would work for this device
 */
export async function testRecovery(): Promise<boolean> {
  console.log('🧪 Testing automatic recovery...');

  const fingerprint = localStorage.getItem(KIOSK_FINGERPRINT_KEY);

  if (!fingerprint) {
    console.error('❌ Cannot test recovery - no fingerprint in localStorage');
    return false;
  }

  console.log('🔍 Checking for device binding with fingerprint:', fingerprint.substring(0, 12) + '...');

  const { data, error } = await supabase
    .from('detail_hub_kiosk_devices')
    .select('kiosk_id, configured_at, last_seen_username')
    .eq('device_fingerprint', fingerprint)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('❌ No device binding found - recovery would FAIL');
    console.log('💡 You need to reconfigure this kiosk to create a device binding');
    return false;
  }

  console.log('✅ Device binding found - recovery would SUCCEED');
  console.log('📋 Recovery would restore:', {
    kioskId: data.kiosk_id,
    configuredAt: data.configured_at,
    username: data.last_seen_username
  });

  return true;
}

// Make functions available globally in browser console for easy debugging
if (typeof window !== 'undefined') {
  (window as any).kioskDiagnostics = {
    diagnose: diagnoseKioskConfig,
    reset: forceResetKioskConfig,
    show: showKioskConfig,
    testRecovery
  };

  console.log('🛠️ Kiosk Diagnostics loaded! Available commands:');
  console.log('  - window.kioskDiagnostics.diagnose() - Full diagnostic check');
  console.log('  - window.kioskDiagnostics.show() - Show current config');
  console.log('  - window.kioskDiagnostics.testRecovery() - Test if recovery would work');
  console.log('  - window.kioskDiagnostics.reset() - Force reset (nuclear option)');
}
