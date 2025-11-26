/**
 * Geolocation Utility
 *
 * Provides GPS location services for remote kiosk punches
 * Requires user permission via browser Geolocation API
 */

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number;
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

/**
 * Request GPS location from browser
 * Requires user permission
 *
 * @returns GPS coordinates or null if permission denied/unavailable
 */
export async function requestGPSLocation(): Promise<GPSCoordinates | null> {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    console.error('[GPS] Geolocation not supported by this browser');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GPSCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        console.log('[GPS] Location obtained:', {
          lat: coords.latitude.toFixed(6),
          lon: coords.longitude.toFixed(6),
          accuracy: `${coords.accuracy.toFixed(1)}m`
        });

        resolve(coords);
      },
      (error) => {
        console.error('[GPS] Error getting location:', {
          code: error.code,
          message: error.message
        });

        resolve(null);
      },
      {
        enableHighAccuracy: true, // Request GPS (not WiFi/cell tower)
        timeout: 10000,           // 10 second timeout
        maximumAge: 0             // Don't use cached position
      }
    );
  });
}

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Get geolocation error details
 */
export function getGeolocationError(error: GeolocationPositionError): GeolocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'PERMISSION_DENIED',
        message: 'Location permission was denied by user'
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: 'Location information is unavailable'
      };
    case error.TIMEOUT:
      return {
        code: 'TIMEOUT',
        message: 'Location request timed out'
      };
    default:
      return {
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported'
      };
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/**
 * Generate Google Maps URL from coordinates
 */
export function getGoogleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}
