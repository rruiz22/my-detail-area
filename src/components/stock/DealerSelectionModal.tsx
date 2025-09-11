import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, MapPin, Users } from 'lucide-react';

interface Dealer {
  id: number;
  name: string;
  city: string;
  state: string;
  subscription_plan: string;
}

interface DealerSelectionModalProps {
  isOpen: boolean;
  dealers: Dealer[];
  onSelectDealer: (dealerId: number, rememberSelection: boolean) => void;
}

export const DealerSelectionModal: React.FC<DealerSelectionModalProps> = ({
  isOpen,
  dealers,
  onSelectDealer
}) => {
  const { t } = useTranslation();
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [rememberSelection, setRememberSelection] = useState(true);

  const handleConfirm = () => {
    if (selectedDealerId) {
      onSelectDealer(selectedDealerId, rememberSelection);
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>{t('stock.dealer_selection.title')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('stock.dealer_selection.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {dealers.map((dealer) => (
              <Card 
                key={dealer.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedDealerId === dealer.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedDealerId(dealer.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{dealer.name}</CardTitle>
                    <Badge variant={getPlanBadgeVariant(dealer.subscription_plan)}>
                      {t(`subscription.plan.${dealer.subscription_plan}`)}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center space-x-2">
                    <MapPin className="w-3 h-3" />
                    <span>{dealer.city}, {dealer.state}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{t('stock.dealer_selection.stock_module_enabled')}</span>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                      {selectedDealerId === dealer.id && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg">
            <Checkbox 
              id="remember"
              checked={rememberSelection}
              onCheckedChange={(checked) => setRememberSelection(checked as boolean)}
            />
            <label 
              htmlFor="remember" 
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {t('stock.dealer_selection.remember_selection')}
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleConfirm}
              disabled={!selectedDealerId}
              className="min-w-24"
            >
              {t('stock.dealer_selection.continue')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};