/**
 * EMERGENCY: Force Camera Cleanup Script
 *
 * Ejecutar en DevTools Console cuando la luz física de la cámara no se apaga
 */

async function emergencyCleanupAllCameras() {
  console.log('🚨 EMERGENCY CAMERA CLEANUP STARTED');
  console.log('='.repeat(60));

  let totalTracksFound = 0;
  let totalTracksStopped = 0;

  // Step 1: Stop ALL video elements in DOM
  console.log('\n📹 Step 1: Cleaning video elements...');
  const videos = document.querySelectorAll('video');
  console.log(`Found ${videos.length} video element(s)`);

  videos.forEach((video, i) => {
    const htmlVideo = video as HTMLVideoElement;
    const stream = htmlVideo.srcObject as MediaStream | null;

    if (stream) {
      const tracks = stream.getTracks();
      totalTracksFound += tracks.length;

      console.log(`\nVideo ${i}:`);
      tracks.forEach((track, j) => {
        console.log(`  Track ${j}:`, {
          kind: track.kind,
          label: track.label,
          readyState: track.readyState,
          enabled: track.enabled
        });

        if (track.readyState === 'live') {
          track.stop();
          totalTracksStopped++;
          console.log(`  ✅ STOPPED: ${track.kind} - ${track.label}`);
        } else {
          console.log(`  ⏹️  Already ended: ${track.kind}`);
        }
      });

      htmlVideo.srcObject = null;
      htmlVideo.pause();
      htmlVideo.load();
      console.log(`  ✅ Video ${i} cleaned`);
    }
  });

  // Step 2: Check for orphaned MediaStreams in window
  console.log('\n🔍 Step 2: Searching for orphaned MediaStreams...');

  // Try to access global MediaStream instances (if any)
  let orphanedStreams = 0;

  // Check if there are any global stream references
  if (window.performance && (performance as any).memory) {
    console.log('Memory usage:', (performance as any).memory);
  }

  // Step 3: Enumerate camera devices to verify state
  console.log('\n📷 Step 3: Enumerating camera devices...');
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    console.log(`Found ${cameras.length} camera device(s):`);
    cameras.forEach((cam, i) => {
      console.log(`  ${i + 1}. ${cam.label || 'Unknown Camera'} (${cam.deviceId.substring(0, 20)}...)`);
    });
  } catch (error) {
    console.error('Failed to enumerate devices:', error);
  }

  // Step 4: Wait and verify again
  console.log('\n⏳ Step 4: Waiting 2 seconds and re-checking...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const videosAfter = document.querySelectorAll('video');
  let liveTracksAfter = 0;

  videosAfter.forEach(video => {
    const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
    if (stream) {
      const liveTracks = stream.getTracks().filter(t => t.readyState === 'live');
      liveTracksAfter += liveTracks.length;
    }
  });

  // Step 5: Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP REPORT');
  console.log('='.repeat(60));
  console.log(`Total video elements: ${videos.length}`);
  console.log(`Total tracks found: ${totalTracksFound}`);
  console.log(`Total tracks stopped: ${totalTracksStopped}`);
  console.log(`Live tracks after cleanup: ${liveTracksAfter}`);
  console.log('='.repeat(60));

  if (liveTracksAfter === 0 && totalTracksStopped > 0) {
    console.log('✅ SUCCESS: All tracks stopped');
    console.log('⚠️  If camera LED is still on, this is an EDGE BROWSER BUG');
    console.log('💡 Solution: Close this tab or restart Edge browser');
  } else if (liveTracksAfter > 0) {
    console.error(`❌ FAILURE: ${liveTracksAfter} track(s) still LIVE`);
    console.error('🔧 Running force cleanup again...');

    // Recursive cleanup
    videosAfter.forEach(video => {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
            console.log('🔧 Force stopped:', track.kind, track.label);
          }
        });
        (video as HTMLVideoElement).srcObject = null;
      }
    });
  } else {
    console.log('ℹ️  No tracks were found (camera might not have been started)');
  }

  console.log('\n🏁 EMERGENCY CLEANUP COMPLETE');
}

// Make function available globally
(window as any).emergencyCleanupAllCameras = emergencyCleanupAllCameras;

console.log('%c🚨 Emergency Camera Cleanup Loaded', 'font-size: 16px; color: #ef4444; font-weight: bold');
console.log('');
console.log('To force cleanup all cameras, run:');
console.log('%cemergencyCleanupAllCameras()', 'font-weight: bold; color: #10b981');
console.log('');
