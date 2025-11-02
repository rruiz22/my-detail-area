import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentDealership, loading } = useAccessibleDealerships();

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('chat.auth_required')}</CardTitle>
              <CardDescription>
                {t('chat.auth_required_desc')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  if (!currentDealership) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>{t('chat.no_dealership_access')}</CardTitle>
              <CardDescription>
                {t('chat.no_dealership_access_desc')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="absolute inset-0 bottom-0 flex flex-col bg-background">
      {/* Compact Header - Fixed at top */}
      <div className="flex-shrink-0 px-3 py-2 border-b bg-background">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
              {t('chat.title')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
              {t('chat.subtitle', { dealership: currentDealership.name })}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground flex-shrink-0" data-testid="dealership-context">
            <Users className="h-3 w-3" />
            <span className="truncate max-w-[120px] sm:max-w-[200px]">{currentDealership.name}</span>
          </div>
        </div>
      </div>

      {/* Chat Interface - Takes remaining height */}
      <div className="flex-1 min-h-0">
        <ChatLayout
          dealerId={currentDealership.id}
          className="h-full"
          data-testid="chat-layout"
        />
      </div>
    </div>
  );
};

export default Chat;
