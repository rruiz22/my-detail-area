import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, MessageSquare, Mail, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrderActions } from '@/hooks/useOrderActions';
import { toast } from 'sonner';

interface CommunicationActionsProps {
  order: any;
}

export function CommunicationActions({ order }: CommunicationActionsProps) {
  const { t } = useTranslation();
  const { sendSMS, sendEmail, loading } = useOrderActions();
  const [smsDialog, setSmsDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const handleCall = () => {
    if (order.customer_phone) {
      window.location.href = `tel:${order.customer_phone}`;
    } else {
      toast.error(t('orders.no_phone_number'));
    }
  };

  const handleSendSMS = async () => {
    if (!order.customer_phone || !smsMessage.trim()) {
      toast.error(t('orders.missing_sms_data'));
      return;
    }

    const success = await sendSMS(
      order.customer_phone, 
      smsMessage.trim(), 
      order.custom_order_number || order.order_number
    );

    if (success) {
      setSmsDialog(false);
      setSmsMessage('');
    }
  };

  const handleSendEmail = async () => {
    if (!order.customer_email || !emailSubject.trim()) {
      toast.error(t('orders.missing_email_data'));
      return;
    }

    const success = await sendEmail(
      order.customer_email,
      emailSubject.trim(),
      order.custom_order_number || order.order_number,
      order.customer_name,
      order
    );

    if (success) {
      setEmailDialog(false);
      setEmailSubject('');
      setEmailMessage('');
    }
  };

  const handleSendAlert = () => {
    // Open SMS dialog with pre-filled urgent message
    setSmsMessage(`URGENT: Your order ${order.custom_order_number || order.order_number} requires immediate attention. Please contact us.`);
    setSmsDialog(true);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCall}
          disabled={!order.customer_phone}
          className="flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          {t('orders.call_contact')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSmsDialog(true)}
          disabled={!order.customer_phone}
          className="flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          {t('orders.send_sms')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEmailSubject(`Order Update - ${order.custom_order_number || order.order_number}`);
            setEmailDialog(true);
          }}
          disabled={!order.customer_email}
          className="flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          {t('orders.send_email')}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleSendAlert}
          disabled={!order.customer_phone}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {t('orders.send_alert')}
        </Button>
      </div>

      {/* SMS Dialog */}
      <Dialog open={smsDialog} onOpenChange={setSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orders.send_sms')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('orders.phone_number')}</Label>
              <Input value={order.customer_phone || ''} disabled />
            </div>
            <div>
              <Label>{t('orders.message')}</Label>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder={t('orders.sms_placeholder')}
                className="min-h-[100px]"
                maxLength={160}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {smsMessage.length}/160 {t('orders.characters')}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSmsDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleSendSMS}
                disabled={loading || !smsMessage.trim()}
              >
                {loading ? t('common.sending') : t('common.send')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('orders.send_email')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('orders.email_address')}</Label>
              <Input value={order.customer_email || ''} disabled />
            </div>
            <div>
              <Label>{t('orders.subject')}</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder={t('orders.email_subject_placeholder')}
              />
            </div>
            <div>
              <Label>{t('orders.message')} ({t('common.optional')})</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder={t('orders.email_message_placeholder')}
                className="min-h-[120px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={loading || !emailSubject.trim()}
              >
                {loading ? t('common.sending') : t('common.send')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}