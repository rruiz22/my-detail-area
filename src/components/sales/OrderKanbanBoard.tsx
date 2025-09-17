import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Edit,
  Eye,
  Trash
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { Order } from '@/hooks/useOrderManagement';
import { safeFormatDateOnly, calculateDaysFromNow, getSystemTimezone } from '@/utils/dateUtils';
import { getStatusRowColor, getStatusBorder } from '@/utils/statusUtils';

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
  icon: any;
}

export function OrderKanbanBoard({ orders, onEdit, onView, onDelete, onStatusChange }: OrderKanbanBoardProps) {
  const { t } = useTranslation();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);

  const columns: KanbanColumn[] = [
    {
      id: 'pending',
      title: 'Pending',
      status: ['pending'],
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      icon: AlertTriangle
    },
    {
      id: 'in_process',
      title: 'In Process',
      status: ['in_progress'],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      icon: Clock
    },
    {
      id: 'complete',
      title: 'Complete',
      status: ['completed'],
      color: 'text-success',
      bgColor: 'bg-success/10',
      icon: Calendar
    },
    {
      id: 'cancelled',
      title: 'Cancelled',
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

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'border-l-destructive bg-destructive/5';
      case 'high': return 'border-l-warning bg-warning/5';
      case 'normal': return 'border-l-primary bg-primary/5';
      case 'low': return 'border-l-muted bg-muted/5';
      default: return 'border-l-border bg-background';
    }
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;

    const diffDays = calculateDaysFromNow(dueDate);
    if (diffDays === null) return null;

    if (diffDays < 0) {
      return { text: 'Overdue', variant: 'destructive' as const, days: Math.abs(diffDays) };
    } else if (diffDays === 0) {
      return { text: 'Due today', variant: 'warning' as const, days: 0 };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', variant: 'secondary' as const, days: 1 };
    } else {
      return { text: `${diffDays}d`, variant: 'outline' as const, days: diffDays };
    }
  };

  // Format due date for time/date display
  const formatDueDateTimeDisplay = (dueDate?: string) => {
    if (!dueDate) return null;

    try {
      const date = new Date(dueDate);
      const timezone = getSystemTimezone();

      return {
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone
        }),
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: timezone
        })
      };
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-300px)] overflow-hidden">
      {columns.map((column) => {
        const columnOrders = getOrdersByColumn(column.status);
        const Icon = column.icon;
        
        return (
          <div
            key={column.id}
            className="flex flex-col min-h-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
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
            >
              {columnOrders.map((order) => {
                const dueInfo = formatDueDate(order.dueDate);
                const dueDateTimeDisplay = formatDueDateTimeDisplay(order.dueDate);

                return (
                  <Card
                    key={order.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, order)}
                    onDragEnd={() => setDraggedOrder(null)}
                    onDoubleClick={() => onView(order)}
                    className={`border-l-4 cursor-move hover:shadow-md transition-all duration-200 ${getStatusBorder(order.status)} ${getStatusRowColor(order.status)} group ${
                      draggedOrder?.id === order.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <CardContent className="p-2">
                      {/* Header: Order Number + Due Time */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm text-foreground">
                            #{order.orderNumber || order.order_number || order.id}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border border-border">
                              <DropdownMenuItem onClick={() => onView(order)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit(order)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(order.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Due Time - Prominent */}
                        <div className="text-right">
                          {dueDateTimeDisplay ? (
                            <>
                              <div className="text-sm font-bold text-primary">
                                {dueDateTimeDisplay.time}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dueDateTimeDisplay.date}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No due date
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Main Content: 2 Column Layout */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {/* Left Column: Names & Info */}
                        <div className="col-span-2 space-y-1">
                          {/* Assigned To */}
                          <div className="text-sm font-medium text-foreground truncate">
                            {order.assignedTo && order.assignedTo !== 'Unassigned' ? order.assignedTo : 'Unassigned'}
                          </div>

                          {/* Customer */}
                          {order.customerName && (
                            <div className="text-xs text-muted-foreground truncate">
                              Customer: {order.customerName}
                            </div>
                          )}

                          {/* Vehicle Info */}
                          {order.vehicleInfo && (
                            <div className="text-xs text-muted-foreground truncate" title={order.vehicleInfo}>
                              {order.vehicleInfo}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Stock & VIN */}
                        <div className="space-y-1 text-right">
                          {order.stockNumber && (
                            <div className="text-xs font-medium text-foreground">
                              {order.stockNumber}
                            </div>
                          )}
                          {order.vehicleVin && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {order.vehicleVin.slice(-8)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Badges + Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <div className="flex items-center gap-1">
                          {dueInfo && (
                            <Badge
                              variant={dueInfo.variant === 'warning' ? 'secondary' : dueInfo.variant}
                              className={`text-xs px-1 py-0 h-4 ${dueInfo.variant === 'warning' ? 'bg-warning/20 text-warning border-warning' : ''}`}
                            >
                              {dueInfo.text}
                            </Badge>
                          )}
                          {order.priority && order.priority !== 'normal' && (
                            <Badge
                              variant={order.priority === 'urgent' ? 'destructive' : 'outline'}
                              className="text-xs px-1 py-0 h-4"
                            >
                              {order.priority}
                            </Badge>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onView(order)}
                            className="h-5 w-5 p-0 hover:bg-primary/10"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(order)}
                            className="h-5 w-5 p-0 hover:bg-primary/10"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {columnOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-sm">No orders</div>
                  <div className="text-xs">Drag orders here</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}