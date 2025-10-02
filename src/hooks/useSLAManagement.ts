import { useMemo, useCallback } from 'react';
import type { OrderData } from '@/types/order';
import { getOrderDateSummary } from '@/utils/orderDateUtils';

interface SLAConfig {
  sales_orders: number; // hours (24/7 real-time)
  service_orders: number; // hours (24/7 real-time)
  recon_orders: number; // hours (24/7 real-time)
  car_wash_orders: number; // hours (24/7 real-time)
}

interface SLAStatus {
  isWithinSLA: boolean;
  timeRemaining: number; // in hours (24/7 real-time)
  percentageUsed: number; // 0-100
  status: 'on_track' | 'at_risk' | 'overdue' | 'completed';
  escalationLevel: 'none' | 'warning' | 'critical' | 'emergency';
}

export function useSLAManagement(order: OrderData) {
  // SLA hours by order type (24/7 real-time calculation)
  const slaConfig: SLAConfig = {
    sales_orders: 72, // 72 hours (3 days 24/7)
    service_orders: 48, // 48 hours (2 days 24/7)
    recon_orders: 96, // 96 hours (4 days 24/7)
    car_wash_orders: 4 // 4 hours same day
  };


  // Calculate SLA status (24/7 real-time)
  const slaStatus = useMemo((): SLAStatus => {
    // Handle completed orders
    if (order.status === 'completed') {
      const { created, due } = getOrderDateSummary(order);
      const completedAt = order.completed_at ? new Date(order.completed_at) : new Date();
      const dueDate = due.isValid && due.rawValue ? new Date(due.rawValue) : null;

      const wasOnTime = dueDate ? completedAt <= dueDate : true;

      return {
        isWithinSLA: wasOnTime,
        timeRemaining: 0,
        percentageUsed: 100,
        status: 'completed',
        escalationLevel: 'none'
      };
    }

    // Handle cancelled orders
    if (order.status === 'cancelled') {
      return {
        isWithinSLA: true, // Cancellation doesn't violate SLA
        timeRemaining: 0,
        percentageUsed: 0,
        status: 'completed',
        escalationLevel: 'none'
      };
    }

    // Handle active orders with 24/7 real-time calculation
    const { created, due } = getOrderDateSummary(order);

    console.log('🏗️ [SLA DEBUG] Date summary:', { created, due });

    if (!created.isValid || !created.rawValue) {
      console.log('❌ [SLA DEBUG] No valid created date found, using defaults');
      return {
        isWithinSLA: true,
        timeRemaining: 0,
        percentageUsed: 0,
        status: 'on_track',
        escalationLevel: 'none'
      };
    }

    const orderType = order.order_type || 'sales_orders';
    const slaHours = slaConfig[orderType as keyof SLAConfig] || slaConfig.sales_orders;

    const createdAt = new Date(created.rawValue);
    const now = new Date();
    const dueDate = due.isValid && due.rawValue ? new Date(due.rawValue) : new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);

    console.log('📊 [SLA CALC]', {
      createdAt: createdAt.toISOString(),
      dueDate: dueDate.toISOString(),
      now: now.toISOString(),
      slaHours,
      orderType
    });

    // Order is completed
    if (order.status === 'completed') {
      const { updated } = getOrderDateSummary(order);
      const completedAt = updated.isValid && updated.rawValue ? new Date(updated.rawValue) : now;

      // For completed orders, calculate time from created to completion vs due date
      const timeToComplete = completedAt.getTime() - createdAt.getTime();
      const timeToDue = dueDate.getTime() - createdAt.getTime();
      const percentageUsed = (timeToComplete / timeToDue) * 100;

      console.log('✅ [SLA COMPLETED]', {
        completedAt: completedAt.toISOString(),
        timeToComplete: Math.round(timeToComplete / (1000 * 60 * 60)),
        timeToDue: Math.round(timeToDue / (1000 * 60 * 60)),
        percentageUsed
      });

      return {
        isWithinSLA: timeToComplete <= timeToDue,
        timeRemaining: 0,
        percentageUsed,
        status: 'completed',
        escalationLevel: timeToComplete <= timeToDue ? 'none' : 'critical'
      };
    }

    // Calculate current progress using 24/7 real-time hours
    const timeElapsed = now.getTime() - createdAt.getTime();
    const timeToDue = dueDate.getTime() - createdAt.getTime();
    const percentageUsed = (timeElapsed / timeToDue) * 100;
    const hoursRemaining = Math.max(0, (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    console.log('⏰ [SLA PROGRESS - 24/7]', {
      timeElapsed: Math.round(timeElapsed / (1000 * 60 * 60)),
      timeToDue: Math.round(timeToDue / (1000 * 60 * 60)),
      percentageUsed: Math.round(percentageUsed),
      hoursRemaining: Math.round(hoursRemaining)
    });

    // Determine status and escalation
    let status: SLAStatus['status'] = 'on_track';
    let escalationLevel: SLAStatus['escalationLevel'] = 'none';

    if (percentageUsed >= 100) {
      status = 'overdue';
      escalationLevel = 'emergency';
    } else if (percentageUsed >= 90) {
      status = 'at_risk';
      escalationLevel = 'critical';
    } else if (percentageUsed >= 75) {
      status = 'at_risk';
      escalationLevel = 'warning';
    }

    console.log('🎯 [SLA STATUS]', {
      finalStatus: status,
      escalationLevel,
      isWithinSLA: percentageUsed < 100,
      percentageUsed: Math.round(percentageUsed)
    });

    return {
      isWithinSLA: percentageUsed < 100,
      timeRemaining: hoursRemaining,
      percentageUsed,
      status,
      escalationLevel
    };
  }, [order]);

  // Generate SLA recommendations
  const getSLARecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (slaStatus.escalationLevel === 'warning') {
      recommendations.push('Consider prioritizing this order');
      recommendations.push('Notify customer of potential delay');
    } else if (slaStatus.escalationLevel === 'critical') {
      recommendations.push('Immediate attention required');
      recommendations.push('Escalate to manager');
      recommendations.push('Contact customer immediately');
    } else if (slaStatus.escalationLevel === 'emergency') {
      const hoursOverdue = Math.round((slaStatus.timeRemaining * -1) || 0);
      recommendations.push(`SLA breach - ${hoursOverdue}+ hours overdue`);
      recommendations.push('Escalate to dealer principal immediately');
      recommendations.push('Contact customer with explanation and timeline');
      recommendations.push('Document delay reason for compliance');
      if (hoursOverdue > 24) {
        recommendations.push('Consider offering customer compensation');
      }
    }

    return recommendations;
  }, [slaStatus.escalationLevel, slaStatus.timeRemaining]);

  // Get SLA color scheme
  const getSLAColors = useCallback(() => {
    switch (slaStatus.escalationLevel) {
      case 'none':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          badge: 'bg-green-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          badge: 'bg-yellow-500'
        };
      case 'critical':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          badge: 'bg-orange-500'
        };
      case 'emergency':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          badge: 'bg-red-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          badge: 'bg-gray-500'
        };
    }
  }, [slaStatus.escalationLevel]);

  return {
    slaStatus,
    getSLARecommendations,
    getSLAColors,
    slaConfig
  };
}