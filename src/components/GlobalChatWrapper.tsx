import { ReactNode } from 'react';
import { GlobalChatProvider } from '@/contexts/GlobalChatProvider';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalChatWrapperProps {
  children: ReactNode;
}

export function GlobalChatWrapper({ children }: GlobalChatWrapperProps) {
  const { user } = useAuth();

  // Always call the hook to avoid Rules of Hooks violation
  const { currentDealership } = useAccessibleDealerships();

  // Always provide the context, but with null dealerId when no dealership or user
  const dealerId = user && currentDealership ? currentDealership.id : undefined;

  return (
    <GlobalChatProvider dealerId={dealerId}>
      {children}
    </GlobalChatProvider>
  );
}