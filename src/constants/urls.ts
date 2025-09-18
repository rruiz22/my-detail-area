/**
 * URL Constants and Configuration
 * Central configuration for all URLs used throughout the application
 */

import { getBaseUrl, buildOrderUrl, buildContactUrl, buildQRRedirectUrl } from '@/utils/urlUtils';

/**
 * Base URL Configuration
 */
export const URL_CONFIG = {
  /**
   * Get the configured base URL
   */
  getBaseUrl,

  /**
   * Check if running in production
   */
  isProduction: () => !getBaseUrl().includes('localhost'),

  /**
   * Get the environment name
   */
  getEnvironment: () => getBaseUrl().includes('localhost') ? 'development' : 'production'
} as const;

/**
 * Application Route Builders
 */
export const ROUTES = {
  // Order-related URLs
  orderDetail: (orderId: string) => buildOrderUrl(orderId),
  salesOrders: () => `${getBaseUrl()}/sales`,
  serviceOrders: () => `${getBaseUrl()}/service`,
  reconOrders: () => `${getBaseUrl()}/recon`,
  carWashOrders: () => `${getBaseUrl()}/carwash`,

  // Contact-related URLs
  contactDetail: (contactId: string) => buildContactUrl(contactId),
  contacts: () => `${getBaseUrl()}/contacts`,

  // QR and short link URLs
  qrRedirect: (slug: string) => buildQRRedirectUrl(slug),

  // User and admin URLs
  userProfile: (userId?: string) => userId ? `${getBaseUrl()}/profile?user=${userId}` : `${getBaseUrl()}/profile`,
  dealership: (dealerId: string) => `${getBaseUrl()}/dealers/${dealerId}`,
  reports: () => `${getBaseUrl()}/reports`,
  settings: () => `${getBaseUrl()}/settings`,
  management: () => `${getBaseUrl()}/management`,

  // Auth URLs
  auth: () => `${getBaseUrl()}/auth`,
  invitation: (token: string) => `${getBaseUrl()}/invitation/${token}`,

  // Dashboard
  dashboard: () => `${getBaseUrl()}/dashboard`,
  home: () => getBaseUrl()
} as const;

/**
 * External Service URLs
 */
export const EXTERNAL_URLS = {
  // mda.to configuration
  mdaTo: {
    domain: 'https://mda.to',
    api: 'https://mda.to/api/url/add',
    shortLink: (slug: string) => `https://mda.to/${slug.toLowerCase()}`
  },

  // Social and sharing
  social: {
    linkedin: (text: string, url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    twitter: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  }
} as const;

/**
 * Email and SMS templates
 */
export const COMMUNICATION_TEMPLATES = {
  orderNotification: (orderId: string, orderNumber: string) => ({
    subject: `Order Update: ${orderNumber}`,
    link: buildOrderUrl(orderId),
    message: `Your order ${orderNumber} has been updated. View details: ${buildOrderUrl(orderId)}`
  }),

  contactShare: (contactId: string, contactName: string) => ({
    subject: `Contact: ${contactName}`,
    link: buildContactUrl(contactId),
    message: `Contact details for ${contactName}: ${buildContactUrl(contactId)}`
  })
} as const;

/**
 * Debug and logging utilities
 */
export const DEBUG_URLS = {
  logCurrentConfig: () => {
    console.log('🔗 URL Configuration:', {
      baseUrl: getBaseUrl(),
      environment: URL_CONFIG.getEnvironment(),
      isProduction: URL_CONFIG.isProduction(),
      sampleUrls: {
        orderDetail: ROUTES.orderDetail('sample-id'),
        contactDetail: ROUTES.contactDetail('sample-id'),
        qrRedirect: ROUTES.qrRedirect('ABC12')
      }
    });
  }
} as const;