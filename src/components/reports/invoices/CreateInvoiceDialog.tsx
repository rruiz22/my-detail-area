// Simplified create invoice dialog - will be implemented after basic structure
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React from 'react';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: number;
}

export const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Invoice creation form coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

