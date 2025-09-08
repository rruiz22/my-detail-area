import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface OrderActionsResult {
  generateQR: (orderId: string, orderNumber: string, dealerId: number) => Promise<{ qrCodeUrl?: string; shortLink?: string }>;
  sendSMS: (to: string, message: string, orderNumber: string) => Promise<boolean>;
  sendEmail: (to: string, subject: string, orderNumber: string, customerName: string, orderDetails: any) => Promise<boolean>;
  loading: boolean;
}

export function useOrderActions(): OrderActionsResult {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const generateQR = async (orderId: string, orderNumber: string, dealerId: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-qr-shortlink', {
        body: { orderId, orderNumber, dealerId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t('orders.qr_generated_successfully'));
        return { qrCodeUrl: data.qrCodeUrl, shortLink: data.shortLink };
      } else {
        throw new Error(data.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error(t('orders.error_generating_qr'));
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