/**
 * Face API Diagnostics Utility
 *
 * Use this in console to debug TensorFlow.js backend issues:
 *
 * import { runFaceApiDiagnostics } from '@/utils/faceApiDiagnostics';
 * runFaceApiDiagnostics();
 */

import { getFaceApiStatus, getTensorFlowBackendInfo, initializeFaceApi } from '@/services/faceApiService';

export async function runFaceApiDiagnostics() {
  console.group('[Face API Diagnostics] Running diagnostic tests...');

  try {
    // 1. Check TensorFlow.js backend BEFORE initialization
    console.log('\n1. TensorFlow.js Backend (Pre-Init):');
    const preInitBackend = getTensorFlowBackendInfo();
    console.table(preInitBackend);

    // 2. Check Face API status
    console.log('\n2. Face API Status (Pre-Init):');
    const preInitStatus = getFaceApiStatus();
    console.table(preInitStatus);

    // 3. Initialize Face API
    console.log('\n3. Initializing Face API...');
    await initializeFaceApi();

    // 4. Check TensorFlow.js backend AFTER initialization
    console.log('\n4. TensorFlow.js Backend (Post-Init):');
    const postInitBackend = getTensorFlowBackendInfo();
    console.table(postInitBackend);

    // 5. Check Face API status again
    console.log('\n5. Face API Status (Post-Init):');
    const postInitStatus = getFaceApiStatus();
    console.table(postInitStatus);

    // 6. Summary
    console.log('\n6. Diagnostic Summary:');
    const summary = {
      '✓ Backend Configured': postInitStatus.backend.initialized,
      '✓ Using CPU Backend': postInitStatus.backend.isCorrect,
      '✓ Models Loaded': postInitStatus.isInitialized,
      '✗ Has Errors': postInitStatus.hasError,
      'Current Backend': postInitStatus.backend.current,
      'Expected Backend': postInitStatus.backend.expected
    };
    console.table(summary);

    if (postInitStatus.backend.isCorrect && postInitStatus.isInitialized) {
      console.log('\n✅ SUCCESS: Face API is correctly configured with CPU backend!');
    } else {
      console.error('\n❌ ERROR: Face API configuration has issues');
      if (postInitStatus.error) {
        console.error('Error details:', postInitStatus.error);
      }
    }

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR during diagnostics:', error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Quick backend check (use in console)
 */
export function checkBackend() {
  const info = getTensorFlowBackendInfo();
  console.log('TensorFlow Backend:', info?.currentBackend || 'not initialized');
  return info;
}

/**
 * Quick status check (use in console)
 */
export function checkStatus() {
  const status = getFaceApiStatus();
  console.log('Face API Status:', {
    ready: status.isInitialized,
    backend: status.backend.current,
    errors: status.hasError
  });
  return status;
}
