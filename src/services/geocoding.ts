/**
 * Geocoding Service
 *
 * Provides reverse geocoding (coordinates → address) using Nominatim API
 * Nominatim is free and doesn't require API key
 *
 * API: OpenStreetMap Nominatim
 * Docs: https://nominatim.org/release-docs/latest/api/Reverse/
 * Rate limit: 1 request/second
 * User-Agent: Required (identifies app to OSM)
 */

export interface GeocodingResult {
  formattedAddress: string;      // Full display address
  street: string | null;          // "123 Main Street"
  city: string | null;            // "Sudbury"
  region: string | null;          // "Ontario"
  country: string | null;         // "Canada"
  postalCode: string | null;      // "P3E 4S7"
  latitude: number;
  longitude: number;
}

interface NominatimResponse {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    'ISO3166-2-lvl4'?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

/**
 * Reverse geocode coordinates to human-readable address
 * Uses Nominatim (OpenStreetMap) API
 *
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns Geocoding result with formatted address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  try {
    // Nominatim reverse geocoding endpoint
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', latitude.toString());
    url.searchParams.set('lon', longitude.toString());
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18'); // Street-level detail

    console.log('[Geocoding] Requesting address for:', {
      lat: latitude.toFixed(6),
      lon: longitude.toFixed(6)
    });

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'MyDetailArea/1.0 (https://dds.mydetailarea.com; contact@mydetailarea.com)',
        'Accept-Language': 'en' // Prefer English addresses
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API returned ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    console.log('[Geocoding] Address obtained:', data.display_name);

    // Extract address components
    const addr = data.address;
    const street = addr.house_number && addr.road
      ? `${addr.house_number} ${addr.road}`
      : addr.road || null;

    const city = addr.city || addr.town || addr.village || addr.municipality || null;
    const region = addr.state || addr.county || null;
    const country = addr.country || null;
    const postalCode = addr.postcode || null;

    return {
      formattedAddress: data.display_name,
      street,
      city,
      region,
      country,
      postalCode,
      latitude,
      longitude
    };

  } catch (error) {
    console.error('[Geocoding] Failed to reverse geocode:', error);

    // Fallback: return coordinates as formatted string
    return {
      formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      street: null,
      city: null,
      region: null,
      country: null,
      postalCode: null,
      latitude,
      longitude
    };
  }
}

/**
 * Format address for compact display
 * Example: "123 Main St, Sudbury, ON"
 */
export function formatAddressCompact(result: GeocodingResult): string {
  const parts: string[] = [];

  if (result.street) parts.push(result.street);
  if (result.city) parts.push(result.city);
  if (result.region) {
    // Abbreviate common regions (Ontario → ON, California → CA)
    const regionAbbr = abbreviateRegion(result.region);
    parts.push(regionAbbr);
  }

  return parts.length > 0 ? parts.join(', ') : result.formattedAddress;
}

/**
 * Abbreviate common region names
 */
function abbreviateRegion(region: string): string {
  const abbreviations: Record<string, string> = {
    'Ontario': 'ON',
    'Quebec': 'QC',
    'British Columbia': 'BC',
    'Alberta': 'AB',
    'California': 'CA',
    'Texas': 'TX',
    'New York': 'NY',
    'Florida': 'FL'
  };

  return abbreviations[region] || region;
}

/**
 * Generate Google Maps URL from geocoding result
 */
export function getMapUrl(result: GeocodingResult): string {
  return `https://www.google.com/maps?q=${result.latitude},${result.longitude}`;
}
