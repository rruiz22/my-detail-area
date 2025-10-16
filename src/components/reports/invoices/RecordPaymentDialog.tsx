// Simplified record payment dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Invoice } from '@/types/invoices';
import React from 'react';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

export const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Payment recording form coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

