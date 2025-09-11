import React from 'react';
import { ContextualChatLauncher } from '@/components/chat/ContextualChatLauncher';
import { UniversalFollowButton } from '@/components/followers/UniversalFollowButton';

interface ChatAndSMSActionsProps {
  orderId: string;
  orderNumber?: string;
  customerPhone?: string;
  dealerId: number;
  className?: string;
  variant?: 'default' | 'compact' | 'icon';
}

export function ChatAndSMSActions({
  orderId,
  orderNumber,
  customerPhone,
  dealerId,
  className = '',
  variant = 'icon'
}: ChatAndSMSActionsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ContextualChatLauncher
        entityType="order"
        entityId={orderId}
        entityName={orderNumber}
        customerPhone={customerPhone}
        variant={variant}
      />
      
      <UniversalFollowButton
        entityType="order"
        entityId={orderId}
        dealerId={dealerId}
        variant="icon-only"
        showCount={false}
        showFollowers={false}
      />
    </div>
  );
}