import { useCallback, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';
import { NotificationContext } from '@/hooks/useNotifications';

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const showSuccess = useCallback((message: string, title = 'Success') => {
    toast({
      title,
      description: message,
      variant: 'default'
    });
  }, []);

  const showError = useCallback((message: string, title = 'Error') => {
    toast({
      title,
      description: message,
      variant: 'destructive'
    });
  }, []);

  const showInfo = useCallback((message: string, title = 'Info') => {
    toast({
      title,
      description: message,
      variant: 'default'
    });
  }, []);

  const showWarning = useCallback((message: string, title = 'Warning') => {
    toast({
      title,
      description: message,
      variant: 'default'
    });
  }, []);

  const value = {
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook moved to @/hooks/useNotifications.ts for better separation