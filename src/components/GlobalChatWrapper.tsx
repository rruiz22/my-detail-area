import { ReactNode } from 'react';
import { GlobalChatProvider } from '@/contexts/GlobalChatProvider';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

interface GlobalChatWrapperProps {
  children: ReactNode;
}

export function GlobalChatWrapper({ children }: GlobalChatWrapperProps) {
  const { currentDealership } = useAccessibleDealerships();

  return (
    <GlobalChatProvider dealerId={currentDealership?.id}>
      {children}
    </GlobalChatProvider>
  );
}