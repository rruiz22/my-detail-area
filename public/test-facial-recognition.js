/**
 * Face Recognition Validation Script
 *
 * Ejecutar en DevTools Console para diagnóstico automatizado
 *
 * INSTRUCCIONES:
 * 1. Abrir http://localhost:8080
 * 2. Abrir DevTools (F12) → Console
 * 3. Copiar y pegar TODO este archivo en console
 * 4. Ejecutar: runFaceRecognitionDiagnostics()
 */

async function runFaceRecognitionDiagnostics() {
  console.log('='.repeat(60));
  console.log('🧪 FACE RECOGNITION DIAGNOSTICS');
  console.log('='.repeat(60));
  console.log('');

  const results = {
    webglBlocked: false,
    modelsExist: false,
    videoElements: [],
    leakedStreams: [],
    tensorflowBackend: null,
    errors: []
  };

  // ============================================
  // TEST 1: WebGL Blocking
  // ============================================
  console.log('📋 TEST 1: WebGL Blocking');
  console.log('-'.repeat(60));

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const gl2 = canvas.getContext('webgl2');

    if (gl === null && gl2 === null) {
      console.log('✅ WebGL BLOCKED - CPU-only mode active');
      results.webglBlocked = true;
    } else {
      console.error('❌ WebGL NOT BLOCKED - This will cause backend errors!');
      console.error('WebGL context:', gl);
      console.error('WebGL2 context:', gl2);
      results.errors.push('WebGL contexts are not blocked');
    }
  } catch (error) {
    console.error('❌ Error testing WebGL:', error);
    results.errors.push(`WebGL test error: ${error.message}`);
  }

  console.log('');

  // ============================================
  // TEST 2: Face API Models
  // ============================================
  console.log('📋 TEST 2: Face API Models Availability');
  console.log('-'.repeat(60));

  const modelFiles = [
    '/models/tiny_face_detector_model-weights_manifest.json',
    '/models/face_landmark_68_model-weights_manifest.json',
    '/models/face_recognition_model-weights_manifest.json'
  ];

  let modelsExist = 0;
  for (const file of modelFiles) {
    try {
      const response = await fetch(file);
      if (response.ok) {
        console.log(`✅ ${file.split('/').pop()}`);
        modelsExist++;
      } else {
        console.error(`❌ ${file.split('/').pop()} - HTTP ${response.status}`);
        results.errors.push(`Model not found: ${file}`);
      }
    } catch (error) {
      console.error(`❌ ${file.split('/').pop()} - ${error.message}`);
      results.errors.push(`Model fetch error: ${file}`);
    }
  }

  results.modelsExist = modelsExist === 3;
  if (results.modelsExist) {
    console.log('\n✅ All 3 models are available');
  } else {
    console.error(`\n❌ Only ${modelsExist}/3 models available`);
  }

  console.log('');

  // ============================================
  // TEST 3: Video Elements & MediaStreams
  // ============================================
  console.log('📋 TEST 3: Video Elements & MediaStream Leaks');
  console.log('-'.repeat(60));

  const videos = document.querySelectorAll('video');
  console.log(`Total video elements in DOM: ${videos.length}`);

  if (videos.length === 0) {
    console.log('ℹ️  No video elements found (expected if modal is closed)');
  } else {
    videos.forEach((video, i) => {
      const stream = video.srcObject;
      const info = {
        index: i,
        hasSrcObject: !!stream,
        trackCount: stream?.getTracks().length || 0,
        tracks: stream?.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState
        })) || []
      };

      results.videoElements.push(info);

      console.log(`\nVideo Element ${i}:`);
      console.log(`  - Has srcObject: ${info.hasSrcObject}`);
      console.log(`  - Track count: ${info.trackCount}`);

      if (info.tracks.length > 0) {
        info.tracks.forEach((track, j) => {
          console.log(`  - Track ${j}: ${track.kind} (${track.readyState})`);
          console.log(`    Label: ${track.label}`);
          console.log(`    Enabled: ${track.enabled}`);

          if (track.readyState === 'live') {
            console.warn(`    ⚠️  WARNING: Track is LIVE (should be "ended" if modal closed)`);
            results.leakedStreams.push({
              videoIndex: i,
              trackIndex: j,
              ...track
            });
          }
        });
      }
    });

    if (results.leakedStreams.length > 0) {
      console.error(`\n❌ FOUND ${results.leakedStreams.length} LEAKED MEDIASTREAM(S)`);
      console.error('This means camera cleanup is NOT working correctly!');
    } else if (videos.length > 0) {
      console.log('\n✅ No leaked MediaStreams detected');
    }
  }

  console.log('');

  // ============================================
  // TEST 4: TensorFlow.js Backend
  // ============================================
  console.log('📋 TEST 4: TensorFlow.js Backend');
  console.log('-'.repeat(60));

  try {
    // Check if TensorFlow is loaded
    if (typeof window.tf !== 'undefined') {
      const backend = window.tf.getBackend();
      results.tensorflowBackend = backend;

      console.log(`Current backend: ${backend}`);

      if (backend === 'cpu') {
        console.log('✅ TensorFlow is using CPU backend (correct)');
      } else {
        console.warn(`⚠️  TensorFlow is using "${backend}" backend (expected "cpu")`);
        results.errors.push(`Unexpected backend: ${backend}`);
      }
    } else {
      console.log('ℹ️  TensorFlow.js not loaded yet (expected if face enrollment not opened)');
    }
  } catch (error) {
    console.error('❌ Error checking TensorFlow backend:', error);
    results.errors.push(`TensorFlow check error: ${error.message}`);
  }

  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ PASSED:');
  if (results.webglBlocked) console.log('  - WebGL is blocked');
  if (results.modelsExist) console.log('  - All face API models exist');
  if (results.leakedStreams.length === 0 && results.videoElements.length > 0) {
    console.log('  - No MediaStream leaks detected');
  }
  if (results.tensorflowBackend === 'cpu') {
    console.log('  - TensorFlow using CPU backend');
  }

  console.log('\n❌ ISSUES:');
  if (!results.webglBlocked) console.log('  - WebGL is NOT blocked (CRITICAL)');
  if (!results.modelsExist) console.log('  - Some face API models are missing');
  if (results.leakedStreams.length > 0) {
    console.log(`  - ${results.leakedStreams.length} MediaStream leak(s) detected`);
  }
  if (results.tensorflowBackend && results.tensorflowBackend !== 'cpu') {
    console.log(`  - TensorFlow using wrong backend: ${results.tensorflowBackend}`);
  }

  if (results.errors.length > 0) {
    console.log('\n🐛 ERRORS:');
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  console.log('');
  console.log('='.repeat(60));

  // Calculate overall status
  const criticalIssues = [
    !results.webglBlocked,
    !results.modelsExist,
    results.leakedStreams.length > 0
  ].filter(Boolean).length;

  if (criticalIssues === 0) {
    console.log('✅ ALL CRITICAL CHECKS PASSED');
    console.log('System is ready for face recognition testing');
  } else {
    console.error(`❌ ${criticalIssues} CRITICAL ISSUE(S) FOUND`);
    console.error('Review errors above before proceeding with testing');
  }

  console.log('='.repeat(60));
  console.log('');

  return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Force cleanup of all MediaStreams (emergency use only)
 */
function forceCleanupAllMediaStreams() {
  console.log('🧹 Force cleaning up all MediaStreams...');

  let cleanedCount = 0;
  document.querySelectorAll('video').forEach((video, i) => {
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`  Stopping track: ${track.kind} (${track.label})`);
        track.stop();
        cleanedCount++;
      });
      video.srcObject = null;
    }
  });

  console.log(`✅ Cleaned ${cleanedCount} track(s)`);
  return cleanedCount;
}

/**
 * Check if camera is currently active
 */
async function isCameraActive() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    console.log(`Found ${cameras.length} camera(s):`);
    cameras.forEach((cam, i) => {
      console.log(`  ${i + 1}. ${cam.label || 'Unknown camera'}`);
    });

    // Check if any video element has active stream
    const activeVideos = Array.from(document.querySelectorAll('video')).filter(v => {
      const stream = v.srcObject;
      return stream && stream.getTracks().some(t => t.readyState === 'live');
    });

    if (activeVideos.length > 0) {
      console.warn(`⚠️  ${activeVideos.length} video element(s) have active camera stream`);
      return true;
    } else {
      console.log('✅ No active camera streams detected');
      return false;
    }
  } catch (error) {
    console.error('Error checking camera status:', error);
    return null;
  }
}

// ============================================
// EXPORT FOR CONSOLE
// ============================================
console.log('%c📦 Face Recognition Diagnostics Loaded', 'font-size: 16px; color: #10b981; font-weight: bold');
console.log('');
console.log('Available commands:');
console.log('  - runFaceRecognitionDiagnostics()  → Run full diagnostic suite');
console.log('  - forceCleanupAllMediaStreams()    → Emergency cleanup of cameras');
console.log('  - isCameraActive()                 → Check if camera is in use');
console.log('');
console.log('Example: runFaceRecognitionDiagnostics()');
console.log('');
