import { DealerModules } from '@/components/dealer/DealerModules';
import { DealerOverview } from '@/components/dealer/DealerOverview';
import { DealerRoles } from '@/components/dealer/DealerRoles';
import { DealerServices } from '@/components/dealer/DealerServices';
import { DealerUsers } from '@/components/dealer/DealerUsers';
import { InvitationManagement } from '@/components/invitations/InvitationManagement';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { supabase } from '@/integrations/supabase/client';
import {
    ArrowLeft,
    BarChart3,
    Building2,
    Mail,
    Settings,
    Shield,
    Users,
    Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

const DealerView = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [dealerName, setDealerName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Dealer-specific tab persistence
  const [activeTab, setActiveTab] = useTabPersistence('dealer_view', id);

  useEffect(() => {
    const fetchDealerInfo = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('dealerships')
          .select('name, logo_url')
          .eq('id', parseInt(id))
          .single();

        if (error) throw error;
        if (data) {
          setDealerName(data.name);
          setLogoUrl(data.logo_url);
        }
      } catch (error) {
        console.error('Error fetching dealer info:', error);
      }
    };

    fetchDealerInfo();
  }, [id]);

  if (!id) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{t('dealer.view.not_found')}</h1>
          <p className="text-muted-foreground">{t('dealer.view.not_found_desc')}</p>
          <Button asChild>
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('dealer.view.back_to_list')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('dealer.view.back')}
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">ID: {id}</Badge>
              <Badge variant="secondary">Active</Badge>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            {logoUrl ? (
              <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <img
                  src={logoUrl}
                  alt={`${dealerName} logo`}
                  className="h-12 w-12 object-contain"
                />
              </div>
            ) : (
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {dealerName || t('dealer.view.loading')}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('dealer.view.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.overview')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.overview_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.roles')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.roles_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.users')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.users_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.invitations')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.invitations_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center space-x-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.tabs.services')}</span>
              <span className="sm:hidden">{t('dealer.tabs.services')}</span>
            </TabsTrigger>
            <PermissionGuard module="management" permission="admin" fallback={<span />}>
              <TabsTrigger value="modules" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dealer.modules.title')}</span>
                <span className="sm:hidden">{t('dealer.modules.title')}</span>
              </TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>{t('dealer.overview.title')}</span>
                </CardTitle>
                <CardDescription>
                  {t('dealer.overview.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DealerOverview dealerId={id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <DealerRoles dealerId={id} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <PermissionGuard module="users" permission="read">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>{t('dealer.view.users.title')}</span>
                  </CardTitle>
                  <CardDescription>
                    {t('dealer.view.users.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DealerUsers dealerId={id} />
                </CardContent>
              </Card>
            </PermissionGuard>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>{t('invitations.title')}</span>
                </CardTitle>
                <CardDescription>
                  {t('invitations.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvitationManagement dealerId={parseInt(id)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>{t('services.title')}</span>
                </CardTitle>
                <CardDescription>
                  {t('services.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DealerServices dealerId={id} />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="modules" className="space-y-6">
            <DealerModules dealerId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default DealerView;
