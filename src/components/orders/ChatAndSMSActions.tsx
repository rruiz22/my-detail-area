import React from 'react';
import { ContextualChatLauncher } from '@/components/chat/ContextualChatLauncher';
import { UniversalFollowButton } from '@/components/followers/UniversalFollowButton';

interface ChatAndSMSActionsProps {
  orderId: string;
  orderNumber?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  dealerId: number;
  className?: string;
  variant?: 'default' | 'compact' | 'icon';
}

export function ChatAndSMSActions({
  orderId,
  orderNumber,
  assignedUserId,
  assignedUserName,
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
        assignedUserId={assignedUserId}
        assignedUserName={assignedUserName}
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