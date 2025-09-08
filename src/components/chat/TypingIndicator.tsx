import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface TypingIndicatorProps {
  users: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  const { t } = useTranslation();

  if (users.length === 0) return null;

  return (
    <div className="flex items-center space-x-2 px-4 py-2">
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((userId, index) => (
          <Avatar key={userId} className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-xs">
              {String.fromCharCode(65 + index)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        
        <span className="text-sm text-muted-foreground">
          {users.length === 1 
            ? t('chat.user_typing') 
            : users.length === 2 
              ? t('chat.two_users_typing')
              : t('chat.multiple_users_typing')
          }
        </span>
      </div>
    </div>
  );
};