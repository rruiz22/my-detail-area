import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { shortLinkService } from '@/services/shortLinkService';

interface OrderActionsResult {
  generateQR: (orderId: string, orderNumber: string, dealerId: number, regenerate?: boolean) => Promise<{ 
    qrCodeUrl?: string; 
    shortLink?: string;
    linkId?: string;
    slug?: string;
    analytics?: {
      totalClicks: number;
      uniqueClicks: number;
      lastClickedAt: string | null;
    };
  }>;
  sendSMS: (to: string, message: string, orderNumber: string) => Promise<boolean>;
  sendEmail: (to: string, subject: string, orderNumber: string, customerName: string, orderDetails: any) => Promise<boolean>;
  loading: boolean;
}

export function useOrderActions(): OrderActionsResult {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const generateQR = async (orderId: string, orderNumber: string, dealerId: number, regenerate = false) => {
    setLoading(true);
    try {
      console.log(`🔗 ${regenerate ? 'Regenerating' : 'Auto-generating'} QR for order:`, orderNumber);

      // Update status to 'generating' before starting
      await supabase.rpc('update_qr_status_only', {
        p_order_id: orderId,
        p_status: 'generating',
        p_increment_attempts: true
      });

      // Use our enhanced shortLinkService with auto_generated flag
      const linkData = regenerate
        ? await shortLinkService.regenerateShortLink(orderId)
        : await shortLinkService.createShortLink(orderId, orderNumber, dealerId);

      // Update order with QR data and completed status
      const { error } = await supabase
        .from('orders')
        .update({
          short_link: linkData.shortUrl,
          qr_code_url: linkData.qrCodeUrl,
          qr_generation_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      const message = regenerate
        ? t('order_detail.regenerate_qr')
        : t('order_detail.qr_auto_generated');

      // Only show toast if not auto-generated (to avoid spam during order creation)
      if (regenerate) {
        toast.success(message);
      }

      return {
        qrCodeUrl: linkData.qrCodeUrl,
        shortLink: linkData.shortUrl,
        linkId: orderId,
        slug: linkData.slug,
        analytics: {
          totalClicks: linkData.analytics?.totalClicks || 0,
          uniqueClicks: linkData.analytics?.uniqueVisitors || 0,
          lastClickedAt: linkData.analytics?.lastClicked || null
        }
      };

    } catch (error) {
      console.error('Error generating QR:', error);

      // Update status to 'failed' on error
      try {
        await supabase.rpc('update_qr_status_only', {
          p_order_id: orderId,
          p_status: 'failed',
          p_increment_attempts: false
        });
      } catch (statusError) {
        console.error('Failed to update QR status:', statusError);
      }

      // Only show toast if regenerate (manual action)
      if (regenerate) {
        toast.error(t('orders.error_generating_qr'));
      }

      return {};
    } finally {
      setLoading(false);
    }
  };

  const sendSMS = async (to: string, message: string, orderNumber: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { to, message, orderNumber },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t('orders.sms_sent_successfully'));
        return true;
      } else {
        throw new Error(data.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error(t('orders.error_sending_sms'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (
    to: string, 
    subject: string, 
    orderNumber: string, 
    customerName: string, 
    orderDetails: any
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: { to, subject, orderNumber, customerName, orderDetails },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t('orders.email_sent_successfully'));
        return true;
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(t('orders.error_sending_email'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateQR,
    sendSMS,
    sendEmail,
    loading,
  };
}