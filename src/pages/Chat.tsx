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
    <>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('chat.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('chat.subtitle', { dealership: currentDealership.name })}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-sm text-muted-foreground" data-testid="dealership-context">
            <Users className="h-4 w-4" />
            <span>{currentDealership.name}</span>
          </div>
        </div>

        {/* Main Chat Interface */}
        <ChatLayout
          dealerId={currentDealership.id}
          className="shadow-sm border-0"
          data-testid="chat-layout"
        />
      </div>
    </>
  );
};

export default Chat;