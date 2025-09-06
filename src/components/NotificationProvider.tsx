import { createContext, useContext, useCallback, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

interface NotificationContextType {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

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

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}