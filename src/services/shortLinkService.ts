import { supabase } from '@/integrations/supabase/client';

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

export class ShortLinkService {
  private readonly domain = 'mda.to';
  
  /**
   * Generate a 5-digit random slug
   */
  private generateSlug(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create short link and QR code for an order
   */
  async createShortLink(orderId: string, orderNumber?: string, dealerId?: number): Promise<ShortLinkData> {
    try {
      console.log(`🔗 Generating short link for order ${orderNumber}`);
      
      // Call Supabase Edge Function to create short link with correct parameters
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: {
          orderId,
          orderNumber: orderNumber || orderId,
          dealerId: dealerId || 5, // Default dealer ID
          regenerate: false
        }
      });

      if (error) {
        console.error('❌ Short link generation failed:', error);
        throw error;
      }

      console.log('✅ Short link created:', data);
      
      return {
        slug: data.slug,
        shortUrl: data.shortLink,
        qrCodeUrl: data.qrCodeUrl,
        deepLink: data.deepLink,
        analytics: {
          totalClicks: data.analytics?.totalClicks || 0,
          uniqueVisitors: data.analytics?.uniqueClicks || 0,
          lastClicked: data.analytics?.lastClickedAt
        }
      };
      
    } catch (error) {
      console.error('❌ ShortLinkService.createShortLink failed:', error);
      throw new Error('Failed to generate short link and QR code');
    }
  }

  /**
   * Get analytics for existing short link
   */
  async getAnalytics(slug: string): Promise<ShortLinkData['analytics']> {
    try {
      const { data, error } = await supabase.functions.invoke('track-qr-click', {
        body: {
          slug,
          action: 'analytics'
        }
      });

      if (error) throw error;

      return {
        totalClicks: data?.totalClicks || 0,
        uniqueVisitors: data?.uniqueVisitors || 0,
        lastClicked: data?.lastClicked
      };
      
    } catch (error) {
      console.error('❌ Failed to get analytics for slug:', slug, error);
      return {
        totalClicks: 0,
        uniqueVisitors: 0
      };
    }
  }

  /**
   * Regenerate short link for an order
   */
  async regenerateShortLink(orderId: string, orderNumber?: string, dealerId?: number): Promise<ShortLinkData> {
    try {
      console.log(`🔄 Regenerating short link for order ${orderId}`);
      
      // Call Edge Function with regenerate flag
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: {
          orderId,
          orderNumber: orderNumber || orderId,
          dealerId: dealerId || 5,
          regenerate: true
        }
      });

      if (error) {
        console.error('❌ Regenerate short link failed:', error);
        throw error;
      }

      return {
        slug: data.slug,
        shortUrl: data.shortLink,
        qrCodeUrl: data.qrCodeUrl,
        deepLink: data.deepLink,
        analytics: {
          totalClicks: data.analytics?.totalClicks || 0,
          uniqueVisitors: data.analytics?.uniqueClicks || 0,
          lastClicked: data.analytics?.lastClickedAt
        }
      };
    } catch (error) {
      console.error('❌ Failed to regenerate short link:', error);
      throw error;
    }
  }

  /**
   * Copy short URL to clipboard
   */
  async copyToClipboard(url: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        console.log('📋 URL copied to clipboard:', url);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Validate slug format
   */
  isValidSlug(slug: string): boolean {
    return /^[A-Z0-9]{5}$/.test(slug);
  }

  /**
   * Get full short URL from slug
   */
  getShortUrl(slug: string): string {
    return `https://${this.domain}/s/${slug}`;
  }
}

// Export singleton instance
export const shortLinkService = new ShortLinkService();