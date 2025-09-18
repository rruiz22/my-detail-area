import { supabase } from '@/integrations/supabase/client';
import { getBaseUrl, buildOrderUrl } from '@/utils/urlUtils';

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
  private readonly baseMdaUrl = 'https://mda.to';

  /**
   * Get the configured base URL for the application
   */
  private getAppBaseUrl(): string {
    return getBaseUrl();
  }
  
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
      
      // Generate mda.to URL regardless of what the Edge Function returns
      const generatedSlug = data.slug || this.generateSlug();
      const mdaUrl = `${this.baseMdaUrl}/${generatedSlug}`;
      
      return {
        slug: generatedSlug,
        shortUrl: mdaUrl, // Force mda.to domain
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
      console.log('📊 Getting analytics for slug:', slug);

      // Try Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('track-qr-click', {
          body: {
            slug,
            action: 'analytics'
          }
        });

        if (!error && data?.analytics) {
          console.log('✅ Edge Function analytics success:', data.analytics);
          return {
            totalClicks: data.analytics.totalClicks || 0,
            uniqueVisitors: data.analytics.uniqueVisitors || 0,
            lastClicked: data.analytics.lastClicked
          };
        } else {
          console.warn('⚠️ Edge Function failed, trying database fallback:', error);
        }
      } catch (edgeFunctionError) {
        console.warn('⚠️ Edge Function error, using database fallback:', edgeFunctionError);
      }

      // Fallback: Direct database query
      console.log('📊 Using database fallback for analytics');

      // Get the link first
      const { data: linkData, error: linkError } = await supabase
        .from('sales_order_links')
        .select('id, total_clicks, unique_clicks, last_clicked_at')
        .eq('slug', slug.toUpperCase())
        .eq('is_active', true)
        .single();

      if (linkError || !linkData) {
        console.warn('⚠️ No link found for slug:', slug);
        return {
          totalClicks: 0,
          uniqueVisitors: 0
        };
      }

      // If we have stored analytics, use them
      if (linkData.total_clicks !== null || linkData.unique_clicks !== null) {
        console.log('✅ Database analytics found:', {
          totalClicks: linkData.total_clicks,
          uniqueVisitors: linkData.unique_clicks,
          lastClicked: linkData.last_clicked_at
        });

        return {
          totalClicks: linkData.total_clicks || 0,
          uniqueVisitors: linkData.unique_clicks || 0,
          lastClicked: linkData.last_clicked_at
        };
      }

      // Alternative: Count from click records if available
      const { data: clickData, error: clickError } = await supabase
        .from('sales_order_link_clicks')
        .select('id, is_unique_click, clicked_at')
        .eq('link_id', linkData.id);

      if (!clickError && clickData) {
        const totalClicks = clickData.length;
        const uniqueVisitors = clickData.filter(click => click.is_unique_click).length;
        const lastClicked = clickData.length > 0 ?
          Math.max(...clickData.map(click => new Date(click.clicked_at).getTime())) : null;

        console.log('✅ Calculated analytics from click records:', {
          totalClicks,
          uniqueVisitors,
          lastClicked: lastClicked ? new Date(lastClicked).toISOString() : null
        });

        return {
          totalClicks,
          uniqueVisitors,
          lastClicked: lastClicked ? new Date(lastClicked).toISOString() : null
        };
      }

      // No analytics available
      console.log('📊 No analytics data available for slug:', slug);
      return {
        totalClicks: 0,
        uniqueVisitors: 0
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
  async regenerateShortLink(orderId: string, slug?: string, dealerId?: number): Promise<ShortLinkData> {
    try {
      console.log(`🔄 Regenerating short link for order ${orderId}`);

      // Call Edge Function with regenerate flag
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: {
          orderId,
          orderNumber: slug || orderId,
          dealerId: dealerId || 5,
          regenerate: true
        }
      });

      if (error) {
        console.error('❌ Regenerate short link failed:', error);
        throw error;
      }

      // Generate mda.to URL regardless of what the Edge Function returns
      const generatedSlug = data.slug || this.generateSlug();
      const mdaUrl = `${this.baseMdaUrl}/${generatedSlug}`;

      return {
        slug: generatedSlug,
        shortUrl: mdaUrl, // Force mda.to domain
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
    return `https://${this.domain}/${slug}`;
  }
}

// Export singleton instance
export const shortLinkService = new ShortLinkService();