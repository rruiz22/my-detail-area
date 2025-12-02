import { useState, memo } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Order } from '@/hooks/useOrderManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { OrderCard } from '@/components/sales/OrderCard';

interface OrderKanbanBoardProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onView: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  status: string[];
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export const OrderKanbanBoard = memo(function OrderKanbanBoard({ orders, onEdit, onView, onDelete, onStatusChange }: OrderKanbanBoardProps) {
  const { t } = useTranslation();
  const { canEditOrder, canDeleteOrder } = usePermissions();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);

  const columns: KanbanColumn[] = [
    {
      id: 'pending',
      title: t('sales_orders.kanban.pending_column'),
      status: ['pending'],
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      icon: AlertTriangle
    },
    {
      id: 'in_process',
      title: t('sales_orders.kanban.in_process_column'),
      status: ['in_progress'],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      icon: Clock
    },
    {
      id: 'complete',
      title: t('sales_orders.kanban.complete_column'),
      status: ['completed'],
      color: 'text-success',
      bgColor: 'bg-success/10',
      icon: Calendar
    },
    {
      id: 'cancelled',
      title: t('sales_orders.kanban.cancelled_column'),
      status: ['cancelled'],
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      icon: AlertTriangle
    }
  ];

  const getOrdersByColumn = (columnStatus: string[]) => {
    return orders.filter(order => 
      columnStatus.some(status => 
        order.status.toLowerCase() === status.toLowerCase()
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedOrder && onStatusChange) {
      // Map column IDs to actual status values that match database constraint
      let newStatus = targetColumnId;
      switch (targetColumnId) {
        case 'pending':
          newStatus = 'pending';
          break;
        case 'in_process':
          newStatus = 'in_progress';
          break;
        case 'complete':
          newStatus = 'completed';
          break;
        case 'cancelled':
          newStatus = 'cancelled';
          break;
        default:
          newStatus = targetColumnId;
      }
      onStatusChange(draggedOrder.id, newStatus);
    }
    setDraggedOrder(null);
  };


  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-300px)] overflow-hidden"
      role="region"
      aria-label={t('accessibility.kanban.board_label')}
    >
      {columns.map((column) => {
        const columnOrders = getOrdersByColumn(column.status);
        const Icon = column.icon;

        return (
          <div
            key={column.id}
            className="flex flex-col min-h-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
            role="region"
            aria-label={t('accessibility.kanban.column_label', { title: column.title, count: columnOrders.length })}
          >
            {/* Column Header */}
            <Card className="border-border shadow-sm mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${column.bgColor}`}>
                      <Icon className={`h-4 w-4 ${column.color}`} />
                    </div>
                    <span className="text-sm font-medium">{column.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnOrders.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Order Cards */}
            <div
              className={`flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-[200px] ${
                draggedOrder ? 'bg-accent/5 border-2 border-dashed border-accent rounded-lg' : ''
              }`}
              role="list"
              aria-label={t('accessibility.kanban.orders_list', { status: column.title })}
            >
              {columnOrders.map((order) => (
                <div key={order.id} role="listitem">
                  <OrderCard
                    order={order}
                    isDragging={draggedOrder?.id === order.id}
                    onEdit={onEdit}
                    onView={onView}
                    onDelete={onDelete}
                    canEdit={canEditOrder(order)}
                    canDelete={canDeleteOrder(order)}
                    onDragStart={handleDragStart}
                    onDragEnd={() => setDraggedOrder(null)}
                  />
                </div>
              ))}

              {columnOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground" role="status">
                  <div className="text-sm">{t('accessibility.kanban.no_orders')}</div>
                  <div className="text-xs">{t('accessibility.kanban.drag_hint')}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});