// =====================================================
// EDIT PAYMENT DIALOG
// Created: 2024-12-16
// Description: Form to edit existing payments for invoices
// =====================================================

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePayment } from '@/hooks/useInvoices';
import type { Invoice, Payment, PaymentFormData, PaymentMethod } from '@/types/invoices';
import { format, parseISO } from 'date-fns';
import { Calendar, CreditCard, DollarSign, Edit2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  payment: Payment;
}

export const EditPaymentDialog: React.FC<EditPaymentDialogProps> = ({
  open,
  onOpenChange,
  invoice,
  payment,
}) => {
  const { toast } = useToast();
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const updatePaymentMutation = useUpdatePayment();

  // Initialize form with payment data when dialog opens
  useEffect(() => {
    if (payment && open) {
      setPaymentDate(parseISO(payment.paymentDate));
      setAmount(payment.amount);
      setPaymentMethod(payment.paymentMethod);
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
    }
  }, [payment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      toast({ variant: 'destructive', description: 'Payment amount must be greater than zero' });
      return;
    }

    // Calculate the maximum allowed amount (total invoice - other payments)
    const otherPaymentsTotal = invoice.amountPaid - payment.amount;
    const maxAllowed = invoice.totalAmount - otherPaymentsTotal;

    if (amount > maxAllowed) {
      toast({
        variant: 'destructive',
        description: `Payment amount cannot exceed ${formatCurrency(maxAllowed)}`
      });
      return;
    }

    const paymentData: PaymentFormData = {
      invoiceId: invoice.id,
      dealerId: invoice.dealerId,
      paymentDate,
      amount,
      paymentMethod,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    };

    try {
      await updatePaymentMutation.mutateAsync({
        paymentId: payment.id,
        formData: paymentData
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update payment:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate what the new invoice balance will be after updating this payment
  const calculateNewBalance = () => {
    const otherPaymentsTotal = invoice.amountPaid - payment.amount;
    const newTotalPaid = otherPaymentsTotal + amount;
    return invoice.totalAmount - newTotalPaid;
  };

  // Calculate the maximum allowed amount for this payment
  const calculateMaxAmount = () => {
    const otherPaymentsTotal = invoice.amountPaid - payment.amount;
    return invoice.totalAmount - otherPaymentsTotal;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit2 className="h-5 w-5" />
            Edit Payment
          </DialogTitle>
          <DialogDescription>
            Edit payment {payment.paymentNumber} for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice & Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total:</span>
              <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Other Payments:</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(invoice.amountPaid - payment.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Payment:</span>
              <span className="font-medium text-emerald-600">
                {formatCurrency(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-semibold">Current Balance:</span>
              <span className="font-bold text-orange-600">
                {formatCurrency(invoice.amountDue)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Date *
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={format(paymentDate, 'yyyy-MM-dd')}
              onChange={(e) => setPaymentDate(parseISO(e.target.value))}
              required
            />
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Amount *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={calculateMaxAmount()}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-7"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum allowed: {formatCurrency(calculateMaxAmount())}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              placeholder="Check #, transaction ID, etc."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional payment notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Summary of Changes */}
          {amount > 0 && amount <= calculateMaxAmount() && (
            <div className="bg-indigo-50 p-4 rounded-lg space-y-2">
              <div className="text-sm text-muted-foreground mb-1">After Update:</div>
              <div className="flex justify-between items-center">
                <span className="text-sm">New Payment Amount:</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">New Invoice Balance:</span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(calculateNewBalance())}
                </span>
              </div>
              {calculateNewBalance() === 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ This update will mark the invoice as paid in full
                </p>
              )}
              {payment.amount > amount && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠ Reducing payment amount by {formatCurrency(payment.amount - amount)}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={amount <= 0 || amount > calculateMaxAmount() || updatePaymentMutation.isPending}
            >
              {updatePaymentMutation.isPending ? 'Updating...' : 'Update Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};