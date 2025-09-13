import { ReactNode } from 'react';
import { GlobalChatProvider } from '@/contexts/GlobalChatProvider';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

interface GlobalChatWrapperProps {
  children: ReactNode;
}

export function GlobalChatWrapper({ children }: GlobalChatWrapperProps) {
  const { currentDealership } = useAccessibleDealerships();

  // Always provide the context, but with null dealerId when no dealership
  return (
    <GlobalChatProvider dealerId={currentDealership?.id || undefined}>
      {children}
    </GlobalChatProvider>
  );
}