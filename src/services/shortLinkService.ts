import { supabase } from '@/integrations/supabase/client';

export interface ShortLinkData {
  slug: string;
  shortUrl: string;
  qrCodeUrl?: string;
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
  async createShortLink(orderId: string, orderNumber?: string): Promise<ShortLinkData> {
    try {
      const slug = this.generateSlug();
      const shortUrl = `https://${this.domain}/s/${slug}`;
      
      console.log(`🔗 Generating short link for order ${orderNumber}: ${shortUrl}`);
      
      // Call Supabase Edge Function to create short link
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: {
          orderId,
          slug,
          domain: this.domain,
          orderNumber,
          redirectUrl: `${window.location.origin}/orders/${orderId}` // Deep link to order
        }
      });

      if (error) {
        console.error('❌ Short link generation failed:', error);
        throw error;
      }

      console.log('✅ Short link created:', data);
      
      return {
        slug,
        shortUrl,
        qrCodeUrl: data?.qrCodeUrl,
        analytics: {
          totalClicks: 0,
          uniqueVisitors: 0
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
  async regenerateShortLink(orderId: string, oldSlug?: string): Promise<ShortLinkData> {
    try {
      console.log(`🔄 Regenerating short link for order ${orderId}`);
      
      // Deactivate old slug if exists
      if (oldSlug) {
        await supabase.functions.invoke('track-qr-click', {
          body: {
            slug: oldSlug,
            action: 'deactivate'
          }
        });
      }

      // Create new short link
      return await this.createShortLink(orderId);
      
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