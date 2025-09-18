/**
 * URL Utilities for BASE_URL Configuration
 * Provides consistent URL generation across the entire application
 */

/**
 * Get the base URL from environment variables
 * Falls back to localhost for development if not configured
 */
export const getBaseUrl = (): string => {
  return import.meta.env.VITE_BASE_URL || "http://localhost:8080";
};

/**
 * Build URL for order details page
 */
export const buildOrderUrl = (orderId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/sales-orders?order=${orderId}`;
};

/**
 * Build URL for contact details page
 */
export const buildContactUrl = (contactId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/contacts/${contactId}`;
};

/**
 * Build URL for QR redirect endpoint
 */
export const buildQRRedirectUrl = (slug: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/s/${slug}`;
};

/**
 * Build URL for dealership page
 */
export const buildDealershipUrl = (dealershipId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/dealers/${dealershipId}`;
};

/**
 * Build URL for user profile page
 */
export const buildProfileUrl = (userId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/profile?user=${userId}`;
};

/**
 * Build absolute URL from relative path
 */
export const buildAbsoluteUrl = (relativePath: string): string => {
  const baseUrl = getBaseUrl();
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Validate if URL is properly formatted
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get current environment (development vs production)
 */
export const isProduction = (): boolean => {
  const baseUrl = getBaseUrl();
  return !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');
};

/**
 * Log URL configuration for debugging
 */
export const logUrlConfig = (): void => {
  console.log('🔗 URL Configuration:', {
    baseUrl: getBaseUrl(),
    environment: isProduction() ? 'production' : 'development',
    configuredFromEnv: !!import.meta.env.VITE_BASE_URL
  });
};