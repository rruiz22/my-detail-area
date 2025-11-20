/**
 * useDeviceFingerprint Hook
 *
 * Generates a unique fingerprint for the current device/browser
 * Combines multiple hardware and browser characteristics for reliable PC identification
 *
 * Used for kiosk PC binding - ensures Time Clock only appears on configured devices
 *
 * @returns {
 *   fingerprint: string - Unique hash identifying this device
 *   username: string - Detected OS username (best effort)
 *   browserInfo: string - User agent string
 *   isReady: boolean - Fingerprint calculation complete
 * }
 */

import { useEffect, useState } from 'react';

interface DeviceFingerprint {
  fingerprint: string;
  username: string;
  browserInfo: string;
  deviceInfo: {
    screen: string;
    colorDepth: number;
    timezone: string;
    platform: string;
    cpuCores: number;
    memory: number;
    language: string;
  };
  isReady: boolean;
}

export function useDeviceFingerprint(): DeviceFingerprint {
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        // Collect device characteristics
        const deviceInfo = {
          screen: `${screen.width}x${screen.height}`,
          colorDepth: screen.colorDepth,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          platform: navigator.platform,
          cpuCores: navigator.hardwareConcurrency || 0,
          memory: (navigator as any).deviceMemory || 0,
          language: navigator.language
        };

        // GPU info (if available)
        let gpuInfo = 'unknown';
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              gpuInfo = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
            }
          }
        } catch (e) {
          console.warn('[Fingerprint] GPU detection failed:', e);
        }

        // Canvas fingerprint (rendering test)
        const canvasHash = await getCanvasFingerprint();

        // Combine all characteristics
        const fingerprintData = {
          ...deviceInfo,
          gpu: gpuInfo,
          canvasHash,
          userAgent: navigator.userAgent
        };

        // Generate hash from combined data
        const fingerprintString = JSON.stringify(fingerprintData);
        const hash = await hashString(fingerprintString);

        console.log('[Fingerprint] Generated device fingerprint:', {
          hash: hash.substring(0, 16) + '...',
          deviceInfo
        });

        setFingerprint(hash);
        setIsReady(true);
      } catch (error) {
        console.error('[Fingerprint] Error generating fingerprint:', error);
        // Fallback to basic fingerprint
        const fallback = await hashString(navigator.userAgent + screen.width + screen.height);
        setFingerprint(fallback);
        setIsReady(true);
      }
    };

    generateFingerprint();
  }, []);

  // Extract OS username from user agent (best effort)
  const username = extractUsername(navigator.userAgent);

  return {
    fingerprint,
    username,
    browserInfo: navigator.userAgent,
    deviceInfo: {
      screen: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
      cpuCores: navigator.hardwareConcurrency || 0,
      memory: (navigator as any).deviceMemory || 0,
      language: navigator.language
    },
    isReady
  };
}

// Helper: Generate canvas fingerprint
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return 'no-canvas';

    // Draw unique pattern
    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('MyDetailArea', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Kiosk ID', 4, 17);

    // Get image data and hash it
    const imageData = canvas.toDataURL();
    return await hashString(imageData);
  } catch (e) {
    console.warn('[Fingerprint] Canvas fingerprint failed:', e);
    return 'canvas-error';
  }
}

// Helper: Hash string using SubtleCrypto
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper: Extract username from user agent (best effort)
function extractUsername(userAgent: string): string {
  // Try to extract Windows username from user agent
  // Example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."

  // Note: Browser doesn't expose actual Windows username for privacy
  // This is a placeholder - real detection would need Edge Function or Electron

  // For now, return a computed identifier based on browser profile
  const platformMatch = userAgent.match(/\(([^)]+)\)/);
  if (platformMatch) {
    return `browser-${platformMatch[1].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  }

  return 'unknown-user';
}
