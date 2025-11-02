import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RecalculateOrderTotalsProps {
  dealerId: number;
  onRecalculated?: () => void;
}

export const RecalculateOrderTotals: React.FC<RecalculateOrderTotalsProps> = ({ dealerId, onRecalculated }) => {
  const [open, setOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const recalculateTotals = async () => {
    setIsRecalculating(true);
    setProgress(0);
    setProcessedCount(0);
    try {
      // Step 1: Fetch all orders for this dealer
      setCurrentStep('Fetching orders...');
      setProgress(10);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, services, order_type')
        .eq('dealer_id', dealerId);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        toast({ description: 'No orders found to recalculate' });
        setOpen(false);
        return;
      }

      setTotalCount(orders.length);
      setProgress(20);

      // Step 2: Fetch all dealer services with current prices
      setCurrentStep('Loading service prices...');
      const { data: dealerServices, error: servicesError } = await supabase
        .from('dealer_services')
        .select('id, price')
        .eq('dealer_id', dealerId);

      if (servicesError) throw servicesError;

      // Create a map of service prices
      const servicePriceMap = new Map(
        dealerServices?.map(s => [s.id, s.price || 0]) || []
      );

      setProgress(30);

      // Step 3: Recalculate total for each order
      setCurrentStep('Calculating new totals...');
      const updates = [];

      for (const order of orders) {
        let newTotal = 0;

        // Handle different service data structures
        if (order.services && Array.isArray(order.services)) {
          for (const service of order.services) {
            let serviceId: string | null = null;

            // Extract service ID from different formats
            if (typeof service === 'string') {
              serviceId = service;
            } else if (service && typeof service === 'object') {
              serviceId = service.id || service.service_id || service.type || null;
            }

            if (serviceId && servicePriceMap.has(serviceId)) {
              newTotal += servicePriceMap.get(serviceId) || 0;
            }
          }
        }

        updates.push({
          id: order.id,
          total_amount: newTotal
        });
      }

      setProgress(50);

      // Step 4: Batch update all orders
      if (updates.length > 0) {
        setCurrentStep('Updating orders in database...');
        const batchSize = 50;
        let processed = 0;

        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);

          for (const update of batch) {
            const { error: updateError } = await supabase
              .from('orders')
              .update({ total_amount: update.total_amount })
              .eq('id', update.id);

            if (updateError) {
              console.error('Error updating order:', update.id, updateError);
            }

            processed++;
            setProcessedCount(processed);
            // Update progress from 50% to 100%
            const progressPercent = 50 + Math.round((processed / updates.length) * 50);
            setProgress(progressPercent);
          }
        }

        setProgress(100);
        setCurrentStep('Complete!');
        toast({ description: `Successfully recalculated ${processed} order totals` });

        // Wait a moment to show 100% before closing
        setTimeout(() => {
          setOpen(false);
          onRecalculated?.();
        }, 1000);
      } else {
        toast({ description: 'No orders needed recalculation' });
        setOpen(false);
      }

    } catch (error: any) {
      console.error('Error recalculating totals:', error);
      toast({ variant: 'destructive', description: `Failed to recalculate: ${error.message}` });
      setOpen(false);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
      >
        <Calculator className="h-4 w-4 mr-2" />
        Recalculate Totals
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Recalculate Order Totals
            </DialogTitle>
            <DialogDescription>
              Update all order totals based on current service prices
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isRecalculating && (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> This will recalculate the total amount for all orders
                    based on current prices in your service catalog.
                  </p>
                </div>

                <Button
                  onClick={recalculateTotals}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Start Recalculation
                </Button>
              </>
            )}

            {isRecalculating && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{currentStep}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {totalCount > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Processing {processedCount} of {totalCount} orders
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
