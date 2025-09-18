import { supabase } from '@/integrations/supabase/client';
import { getBaseUrl } from '@/utils/urlUtils';

export interface ShortLinkData {
  slug: string;
  shortUrl: string;
  qrCodeUrl?: string;
  deepLink?: string;
  analytics?: {
    totalClicks: number;
    uniqueVisitors: number;
    lastClicked?: string;
  };
}

// Constants for better maintainability
const MDA_DOMAIN = 'mda.to';
const MDA_BASE_URL = 'https://mda.to';
const DEFAULT_DEALER_ID = 5;
const SLUG_LENGTH = 5;
const SLUG_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class ShortLinkService {
  private readonly domain = MDA_DOMAIN;
  private readonly baseMdaUrl = MDA_BASE_URL;

  /**
   * Get the configured base URL for the application
   */
  private getAppBaseUrl(): string {
    return getBaseUrl();
  }

  /**
   * Format short link data from Edge Function response
   */
  private formatShortLinkData(data: any): ShortLinkData {
    const generatedSlug = data.slug || this.generateSlug();
    const mdaUrl = `${this.baseMdaUrl}/${generatedSlug}`;

    return {
      slug: generatedSlug,
      shortUrl: mdaUrl,
      qrCodeUrl: data.qrCodeUrl,
      deepLink: data.deepLink,
      analytics: {
        totalClicks: data.analytics?.totalClicks || 0,
        uniqueVisitors: data.analytics?.uniqueClicks || 0,
        lastClicked: data.analytics?.lastClickedAt
      }
    };
  }

  /**
   * Generate a random slug
   */
  private generateSlug(): string {
    let result = '';
    for (let i = 0; i < SLUG_LENGTH; i++) {
      result += SLUG_CHARS.charAt(Math.floor(Math.random() * SLUG_CHARS.length));
    }
    return result;
  }

  /**
   * Create short link and QR code for an order
   */
  async createShortLink(orderId: string, orderNumber?: string, dealerId?: number): Promise<ShortLinkData> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: {
          orderId,
          orderNumber: orderNumber || orderId,
          dealerId: dealerId || DEFAULT_DEALER_ID,
          regenerate: false
        }
      });

      if (error) {
        throw new Error(`Short link generation failed: ${error.message || error}`);
      }

      return this.formatShortLinkData(data);
    } catch (error) {
      throw new Error(`Failed to generate short link and QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analytics for existing short link
   * SIMPLIFIED: Returns zero analytics until Edge Functions are properly deployed
   */
  async getAnalytics(slug: string): Promise<ShortLinkData['analytics']> {
    // Return dummy analytics to prevent console errors
    // Edge Functions need to be deployed first
    return {
      totalClicks: 0,
      uniqueVisitors: 0,
      lastClicked: null
    };
  }

  /**
   * Regenerate short link for an order
   */
  async regenerateShortLink(orderId: string, slug?: string, dealerId?: number): Promise<ShortLinkData> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: {
          orderId,
          orderNumber: slug || orderId,
          dealerId: dealerId || DEFAULT_DEALER_ID,
          regenerate: true
        }
      });

      if (error) {
        throw new Error(`Regenerate short link failed: ${error.message || error}`);
      }

      return this.formatShortLinkData(data);
    } catch (error) {
      throw new Error(`Failed to regenerate short link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy short URL to clipboard
   */
  async copyToClipboard(url: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate slug format
   */
  isValidSlug(slug: string): boolean {
    const regex = new RegExp(`^[A-Z0-9]{${SLUG_LENGTH}}$`);
    return regex.test(slug);
  }

  /**
   * Get full short URL from slug
   */
  getShortUrl(slug: string): string {
    return `https://${this.domain}/${slug}`;
  }
}

// Export singleton instance
export const shortLinkService = new ShortLinkService();
