import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Plus, 
  Minus, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Wrench, 
  Package, 
  User,
  Edit,
  Trash2,
  Save
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CostItem {
  id: string;
  category: 'labor' | 'parts' | 'materials' | 'external';
  description: string;
  estimated_cost: number;
  actual_cost?: number;
  quantity: number;
  unit_price: number;
  supplier?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'completed';
  created_at: string;
}

interface ReconCostingSystemProps {
  orderId: string;
  vehicleInfo: {
    vin: string;
    make: string;
    model: string;
    year: number;
  };
  className?: string;
}

export function ReconCostingSystem({ orderId, vehicleInfo, className }: ReconCostingSystemProps) {
  const { t } = useTranslation();
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [newItem, setNewItem] = useState({
    category: 'labor' as const,
    description: '',
    quantity: 1,
    unit_price: 0,
    supplier: '',
    notes: ''
  });

  // Mock data initialization
  useEffect(() => {
    const mockCostItems: CostItem[] = [
      {
        id: '1',
        category: 'labor',
        description: 'Paint correction and ceramic coating',
        estimated_cost: 850,
        actual_cost: 920,
        quantity: 8,
        unit_price: 115,
        status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        category: 'parts',
        description: 'Front bumper replacement',
        estimated_cost: 450,
        actual_cost: 425,
        quantity: 1,
        unit_price: 425,
        supplier: 'Auto Parts Plus',
        status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '3',
        category: 'materials',
        description: 'Premium detailing supplies',
        estimated_cost: 120,
        quantity: 1,
        unit_price: 120,
        supplier: 'Chemical Guys',
        status: 'pending',
        created_at: '2024-01-16T09:00:00Z'
      },
      {
        id: '4',
        category: 'external',
        description: 'Upholstery repair service',
        estimated_cost: 300,
        quantity: 1,
        unit_price: 300,
        supplier: 'Premium Interior Works',
        status: 'approved',
        created_at: '2024-01-16T14:00:00Z'
      }
    ];
    setCostItems(mockCostItems);
  }, []);

  const totalEstimated = costItems.reduce((sum, item) => sum + item.estimated_cost, 0);
  const totalActual = costItems.reduce((sum, item) => sum + (item.actual_cost || item.estimated_cost), 0);
  const variance = totalActual - totalEstimated;
  const variancePercentage = totalEstimated > 0 ? (variance / totalEstimated) * 100 : 0;
  const completedItems = costItems.filter(item => item.status === 'completed').length;
  const completionRate = (completedItems / costItems.length) * 100;

  const handleAddItem = () => {
    const item: CostItem = {
      id: Date.now().toString(),
      ...newItem,
      estimated_cost: newItem.quantity * newItem.unit_price,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setCostItems([...costItems, item]);
    setNewItem({
      category: 'labor',
      description: '',
      quantity: 1,
      unit_price: 0,
      supplier: '',
      notes: ''
    });
    setIsAddingItem(false);
    
    toast({ description: t('recon_costing.item_added') });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<CostItem>) => {
    setCostItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              ...updates,
              estimated_cost: updates.quantity && updates.unit_price 
                ? updates.quantity * updates.unit_price 
                : item.estimated_cost
            }
          : item
      )
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setCostItems(items => items.filter(item => item.id !== itemId));
    toast({ description: t('recon_costing.item_deleted') });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'labor': return User;
      case 'parts': return Wrench;
      case 'materials': return Package;
      case 'external': return DollarSign;
      default: return Calculator;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labor': return 'bg-primary/10 text-primary';
      case 'parts': return 'bg-secondary/10 text-secondary';
      case 'materials': return 'bg-accent/10 text-accent';
      case 'external': return 'bg-warning/10 text-warning';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success-foreground';
      case 'approved': return 'bg-warning/20 text-warning-foreground';
      case 'pending': return 'bg-muted/20 text-muted-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const ItemForm = ({ 
    item, 
    isEditing = false, 
    onSave, 
    onCancel 
  }: {
    item: any;
    isEditing?: boolean;
    onSave: (data: any) => void;
    onCancel: () => void;
  }) => (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>{t('recon_costing.category')}</Label>
          <Select 
            value={item.category} 
            onValueChange={(value) => setNewItem({...item, category: value as any})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="labor">{t('recon_costing.categories.labor')}</SelectItem>
              <SelectItem value="parts">{t('recon_costing.categories.parts')}</SelectItem>
              <SelectItem value="materials">{t('recon_costing.categories.materials')}</SelectItem>
              <SelectItem value="external">{t('recon_costing.categories.external')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>{t('recon_costing.supplier')}</Label>
          <Input
            value={item.supplier}
            onChange={(e) => setNewItem({...item, supplier: e.target.value})}
            placeholder={t('recon_costing.supplier_placeholder')}
          />
        </div>
      </div>

      <div>
        <Label>{t('recon_costing.description')}</Label>
        <Textarea
          value={item.description}
          onChange={(e) => setNewItem({...item, description: e.target.value})}
          placeholder={t('recon_costing.description_placeholder')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>{t('recon_costing.quantity')}</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={(e) => setNewItem({...item, quantity: parseFloat(e.target.value) || 0})}
          />
        </div>
        
        <div>
          <Label>{t('recon_costing.unit_price')}</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={item.unit_price}
              onChange={(e) => setNewItem({...item, unit_price: parseFloat(e.target.value) || 0})}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label>{t('recon_costing.total')}</Label>
          <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-semibold text-primary">
            ${(item.quantity * item.unit_price).toFixed(2)}
          </div>
        </div>
      </div>

      <div>
        <Label>{t('recon_costing.notes')}</Label>
        <Textarea
          value={item.notes}
          onChange={(e) => setNewItem({...item, notes: e.target.value})}
          placeholder={t('recon_costing.notes_placeholder')}
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(item)} className="button-enhanced">
          <Save className="w-4 h-4 mr-2" />
          {isEditing ? t('common.update') : t('common.add')}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recon_costing.estimated_total')}
                </p>
                <p className="text-2xl font-bold">${totalEstimated.toFixed(2)}</p>
              </div>
              <Calculator className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recon_costing.actual_total')}
                </p>
                <p className="text-2xl font-bold">${totalActual.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recon_costing.variance')}
                </p>
                <div className="flex items-center gap-1">
                  <p className={cn(
                    "text-2xl font-bold",
                    variance >= 0 ? "text-destructive" : "text-success"
                  )}>
                    ${Math.abs(variance).toFixed(2)}
                  </p>
                  {variance >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-success" />
                  )}
                </div>
                <p className={cn(
                  "text-xs",
                  variance >= 0 ? "text-destructive" : "text-success"
                )}>
                  {variance >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recon_costing.completion')}
                </p>
                <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
                <Progress value={completionRate} className="h-2 mt-2" />
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {t('recon_costing.cost_breakdown')}
            </CardTitle>
            <Button 
              onClick={() => setIsAddingItem(true)} 
              className="button-enhanced"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('recon_costing.add_cost_item')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Add New Item Form */}
          {isAddingItem && (
            <ItemForm
              item={newItem}
              onSave={handleAddItem}
              onCancel={() => setIsAddingItem(false)}
            />
          )}

          {/* Cost Items List */}
          <div className="space-y-3">
            {costItems.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              const isEditing = editingItem?.id === item.id;
              
              return (
                <div key={item.id}>
                  {isEditing ? (
                    <ItemForm
                      item={editingItem}
                      isEditing={true}
                      onSave={(data) => {
                        handleUpdateItem(item.id, data);
                        setEditingItem(null);
                      }}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <Card className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            getCategoryColor(item.category)
                          )}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{item.description}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">
                                    {t(`recon_costing.categories.${item.category}`)}
                                  </Badge>
                                  <Badge className={getStatusColor(item.status)}>
                                    {t(`recon_costing.statuses.${item.status}`)}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-lg font-bold">
                                  ${(item.actual_cost || item.estimated_cost).toFixed(2)}
                                </p>
                                {item.actual_cost && item.actual_cost !== item.estimated_cost && (
                                  <p className={cn(
                                    "text-sm",
                                    item.actual_cost > item.estimated_cost 
                                      ? "text-destructive" 
                                      : "text-success"
                                  )}>
                                    Est: ${item.estimated_cost.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">
                                  {t('recon_costing.quantity')}: 
                                </span> {item.quantity}
                              </div>
                              <div>
                                <span className="font-medium">
                                  {t('recon_costing.unit_price')}: 
                                </span> ${item.unit_price.toFixed(2)}
                              </div>
                              {item.supplier && (
                                <div>
                                  <span className="font-medium">
                                    {t('recon_costing.supplier')}: 
                                  </span> {item.supplier}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">
                                  {t('recon_costing.added')}: 
                                </span> {new Date(item.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            
                            {item.notes && (
                              <>
                                <Separator />
                                <p className="text-sm italic text-muted-foreground">
                                  "{item.notes}"
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>

          {costItems.length === 0 && (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('recon_costing.no_cost_items')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('recon_costing.no_cost_items_desc')}
              </p>
              <Button onClick={() => setIsAddingItem(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('recon_costing.add_first_item')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}