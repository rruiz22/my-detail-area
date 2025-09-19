import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';

interface OrderStatusInfo {
  badge: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

interface OrderStatusBadgesProps {
  order: any;
}

export function OrderStatusBadges({ order }: OrderStatusBadgesProps) {
  
  const calculateStatusInfo = (order: any): OrderStatusInfo[] => {
    const badges: OrderStatusInfo[] = [];
    const now = new Date();
    
    // Due date analysis
    if (order.due_date) {
      const dueDate = new Date(order.due_date);
      const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        badges.push({
          badge: 'ON TIME',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CheckCircle className="h-3 w-3" />,
          description: 'Ahead of schedule'
        });
      } else if (hoursDiff > 0 && hoursDiff <= 24) {
        badges.push({
          badge: 'DUE TODAY',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Calendar className="h-3 w-3" />,
          description: 'Due within 24 hours'
        });
      } else if (hoursDiff > -24 && hoursDiff <= 0) {
        badges.push({
          badge: 'DELAYED',
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: <AlertTriangle className="h-3 w-3" />,
          description: 'Past due but within grace period'
        });
      } else {
        badges.push({
          badge: 'OVERDUE',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <AlertTriangle className="h-3 w-3" />,
          description: 'Significantly overdue'
        });
      }
    }

    // Order age analysis  
    if (order.created_at) {
      const createdDate = new Date(order.created_at);
      const daysSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreated < 1) {
        badges.push({
          badge: 'NEW',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Clock className="h-3 w-3" />,
          description: 'Created today'
        });
      } else if (daysSinceCreated > 7) {
        badges.push({
          badge: 'AGED',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Clock className="h-3 w-3" />,
          description: 'Order is over a week old'
        });
      }
    }

    // Priority analysis
    if (order.priority === 'high' || order.priority === 'urgent') {
      badges.push({
        badge: 'PRIORITY',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <AlertTriangle className="h-3 w-3" />,
        description: 'High priority order'
      });
    }

    return badges;
  };

  const statusBadges = calculateStatusInfo(order);

  if (statusBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statusBadges.map((statusInfo, index) => (
        <Badge 
          key={index}
          variant="outline" 
          className={`${statusInfo.color} border text-xs font-medium`}
          title={statusInfo.description}
        >
          {statusInfo.icon}
          <span className="ml-1">{statusInfo.badge}</span>
        </Badge>
      ))}
    </div>
  );
}