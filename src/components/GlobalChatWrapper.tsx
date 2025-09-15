import { ReactNode } from 'react';
import { GlobalChatProvider } from '@/contexts/GlobalChatProvider';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalChatWrapperProps {
  children: ReactNode;
}

export function GlobalChatWrapper({ children }: GlobalChatWrapperProps) {
  const { user } = useAuth();
  
  // Only fetch dealerships if user is authenticated
  const { currentDealership } = user ? useAccessibleDealerships() : { currentDealership: null };

  // Always provide the context, but with null dealerId when no dealership or user
  return (
    <GlobalChatProvider dealerId={currentDealership?.id || undefined}>
      {children}
    </GlobalChatProvider>
  );
}