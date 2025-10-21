import { useDealerFilter } from '@/contexts/DealerFilterContext';
import {
    Droplet,
    FileText,
    LucideIcon,
    ShoppingCart,
    Sparkles,
    UserPlus,
    Wrench,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { usePermissions } from './usePermissions';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  requiresDealer?: boolean;
}

interface UseContextualActionsReturn {
  actions: QuickAction[];
  hasActions: boolean;
}

/**
 * Custom hook that provides contextual quick actions based on:
 * - Current route/page
 * - User permissions
 * - Selected dealership
 */
export const useContextualActions = (): UseContextualActionsReturn => {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const { selectedDealerId, currentDealership } = useDealerFilter();

  const actions: QuickAction[] = [];

  // Helper function to navigate
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  // Dashboard actions
  if (location.pathname === '/dashboard') {
    if (hasPermission('sales_orders', 'write') && currentDealership) {
      actions.push({
        id: 'new-sales-order',
        label: 'quick_actions.new_sales_order',
        icon: ShoppingCart,
        action: () => navigateTo('/sales-orders'),
        variant: 'default',
        requiresDealer: true,
      });
    }

    if (hasPermission('service_orders', 'write') && currentDealership) {
      actions.push({
        id: 'new-service-order',
        label: 'quick_actions.new_service_order',
        icon: Wrench,
        action: () => navigateTo('/service-orders'),
        variant: 'outline',
        requiresDealer: true,
      });
    }

    if (hasPermission('reports', 'read')) {
      actions.push({
        id: 'view-reports',
        label: 'quick_actions.view_reports',
        icon: FileText,
        action: () => navigateTo('/reports'),
        variant: 'ghost',
      });
    }
  }

  // Sales Orders page actions
  if (location.pathname === '/sales-orders') {
    if (hasPermission('sales_orders', 'write') && currentDealership) {
      actions.push({
        id: 'new-sales-order',
        label: 'quick_actions.new_sales_order',
        icon: ShoppingCart,
        action: () => {
          // Trigger new order modal - this would be handled by the parent component
          const event = new CustomEvent('open-new-order-modal', { detail: { type: 'sales' } });
          window.dispatchEvent(event);
        },
        variant: 'default',
        requiresDealer: true,
      });
    }

    if (hasPermission('reports', 'read')) {
      actions.push({
        id: 'export-sales',
        label: 'quick_actions.export_sales',
        icon: FileText,
        action: () => {
          const event = new CustomEvent('export-orders', { detail: { type: 'sales' } });
          window.dispatchEvent(event);
        },
        variant: 'outline',
      });
    }
  }

  // Service Orders page actions
  if (location.pathname === '/service-orders') {
    if (hasPermission('service_orders', 'write') && currentDealership) {
      actions.push({
        id: 'new-service-order',
        label: 'quick_actions.new_service_order',
        icon: Wrench,
        action: () => {
          const event = new CustomEvent('open-new-order-modal', { detail: { type: 'service' } });
          window.dispatchEvent(event);
        },
        variant: 'default',
        requiresDealer: true,
      });
    }
  }

  // Recon Orders page actions
  if (location.pathname === '/recon-orders') {
    if (hasPermission('recon_orders', 'write') && currentDealership) {
      actions.push({
        id: 'new-recon-order',
        label: 'quick_actions.new_recon_order',
        icon: Sparkles,
        action: () => {
          const event = new CustomEvent('open-new-order-modal', { detail: { type: 'recon' } });
          window.dispatchEvent(event);
        },
        variant: 'default',
        requiresDealer: true,
      });
    }
  }

  // Car Wash page actions
  if (location.pathname === '/car-wash') {
    if (hasPermission('car_wash', 'write') && currentDealership) {
      actions.push({
        id: 'new-car-wash',
        label: 'quick_actions.new_car_wash',
        icon: Droplet,
        action: () => {
          const event = new CustomEvent('open-new-order-modal', { detail: { type: 'car_wash' } });
          window.dispatchEvent(event);
        },
        variant: 'default',
        requiresDealer: true,
      });
    }
  }

  // Contacts page actions
  if (location.pathname === '/contacts') {
    if (hasPermission('contacts', 'write')) {
      actions.push({
        id: 'new-contact',
        label: 'quick_actions.new_contact',
        icon: UserPlus,
        action: () => {
          const event = new CustomEvent('open-new-contact-modal');
          window.dispatchEvent(event);
        },
        variant: 'default',
      });
    }
  }

  // Users page actions
  if (location.pathname === '/users') {
    if (hasPermission('users', 'write')) {
      actions.push({
        id: 'invite-user',
        label: 'quick_actions.invite_user',
        icon: UserPlus,
        action: () => {
          const event = new CustomEvent('open-invite-user-modal');
          window.dispatchEvent(event);
        },
        variant: 'default',
      });
    }
  }

  // Dealerships page actions
  // Note: Removed quick action - "Add Dealership" button is already on the page
  // if (location.pathname === '/dealers') {
  //   if (hasPermission('dealerships', 'write')) {
  //     actions.push({
  //       id: 'new-dealership',
  //       label: 'quick_actions.new_dealership',
  //       icon: Building2,
  //       action: () => {
  //         const event = new CustomEvent('open-new-dealership-modal');
  //         window.dispatchEvent(event);
  //       },
  //       variant: 'default',
  //     });
  //   }
  // }

  // Filter out actions that require a dealer when none is selected
  const filteredActions = actions.filter((action) => {
    if (action.requiresDealer && selectedDealerId === 'all') {
      return false;
    }
    return true;
  });

  return {
    actions: filteredActions,
    hasActions: filteredActions.length > 0,
  };
};
