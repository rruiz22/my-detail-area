/**
 * Network Detection Utilities
 *
 * Detects IP address and provides utilities for network information.
 * Used by kiosk configuration to automatically detect device information.
 */

/**
 * Detect public IP address using external API
 */
export async function detectPublicIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to fetch IP');

    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error('[NetworkDetection] Failed to detect public IP:', error);
    return null;
  }
}

/**
 * Detect local IP address using WebRTC
 * Note: May be blocked by browser privacy settings
 */
export async function detectLocalIP(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const noop = () => {};

      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(noop);

      const timeout = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 5000);

      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;

        const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
        const ipMatch = ipRegex.exec(ice.candidate.candidate);

        if (ipMatch && ipMatch[0]) {
          clearTimeout(timeout);
          pc.close();

          // Filter out invalid IPs
          const ip = ipMatch[0];
          if (ip !== '0.0.0.0' && !ip.startsWith('127.')) {
            resolve(ip);
          }
        }
      };
    } catch (error) {
      console.error('[NetworkDetection] WebRTC IP detection failed:', error);
      resolve(null);
    }
  });
}

/**
 * Detect best available IP (tries local first, falls back to public)
 */
export async function detectBestIP(): Promise<{ ip: string | null; type: 'local' | 'public' | null }> {
  console.log('[NetworkDetection] Starting IP detection...');

  // Try local IP first (faster)
  const localIP = await detectLocalIP();
  if (localIP) {
    console.log('[NetworkDetection] ✅ Local IP detected:', localIP);
    return { ip: localIP, type: 'local' };
  }

  console.log('[NetworkDetection] ⚠️ Local IP detection failed, trying public IP...');

  // Fall back to public IP
  const publicIP = await detectPublicIP();
  if (publicIP) {
    console.log('[NetworkDetection] ✅ Public IP detected:', publicIP);
    return { ip: publicIP, type: 'public' };
  }

  console.log('[NetworkDetection] ❌ IP detection failed');
  return { ip: null, type: null };
}

/**
 * Validate MAC address format
 */
export function isValidMacAddress(mac: string): boolean {
  // Common MAC address formats:
  // AA:BB:CC:DD:EE:FF
  // AA-BB-CC-DD-EE-FF
  // AABBCCDDEEFF
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/;
  return macRegex.test(mac);
}

/**
 * Format MAC address to standard format (AA:BB:CC:DD:EE:FF)
 */
export function formatMacAddress(mac: string): string {
  // Remove all separators
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();

  // Insert colons every 2 characters
  return cleaned.match(/.{1,2}/g)?.join(':') || mac;
}

/**
 * Get network information for kiosk setup
 */
export async function getNetworkInfo(): Promise<{
  ip: string | null;
  ipType: 'local' | 'public' | null;
  userAgent: string;
  platform: string;
  language: string;
}> {
  const { ip, type } = await detectBestIP();

  return {
    ip,
    ipType: type,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}
