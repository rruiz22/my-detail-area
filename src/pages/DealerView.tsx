import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  BarChart3, 
  Shield, 
  Users,
  ArrowLeft,
  Wrench,
  Tag,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { DealerOverview } from '@/components/dealer/DealerOverview';
import { DealerGroups } from '@/components/dealer/DealerGroups';
import { DealerUsers } from '@/components/dealer/DealerUsers';
import { DealerServices } from '@/components/dealer/DealerServices';
import { DealerCategories } from '@/components/dealer/DealerCategories';
import { DealerModules } from '@/components/dealer/DealerModules';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const DealerView = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [dealerName, setDealerName] = useState<string>('');

  useEffect(() => {
    const fetchDealerInfo = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('dealerships')
          .select('name')
          .eq('id', parseInt(id))
          .single();
        
        if (error) throw error;
        if (data) {
          setDealerName(data.name);
        }
      } catch (error) {
        console.error('Error fetching dealer info:', error);
      }
    };

    fetchDealerInfo();
  }, [id]);

  if (!id) {
    return (
      <DashboardLayout title={t('dealer.view.not_found')}>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{t('dealer.view.not_found')}</h1>
          <p className="text-muted-foreground">{t('dealer.view.not_found_desc')}</p>
          <Button asChild>
            <Link to="/dealerships">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('dealer.view.back_to_list')}
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dealerships">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('dealer.view.back')}
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-primary" />
                <span>{dealerName || t('dealer.view.title')}</span>
              </h1>
              <p className="text-muted-foreground">
                Dealer Management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default">ID: {id}</Badge>
            <Badge variant="outline">{t('dealer.view.active')}</Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.overview')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.overview_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.groups')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.groups_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.view.tabs.users')}</span>
              <span className="sm:hidden">{t('dealer.view.tabs.users_short')}</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center space-x-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.tabs.services')}</span>
              <span className="sm:hidden">{t('dealer.tabs.services')}</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dealer.tabs.categories')}</span>
              <span className="sm:hidden">{t('dealer.tabs.categories')}</span>
            </TabsTrigger>
            <PermissionGuard module="management" permission="admin">
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
                  <span>{t('dealer.view.overview.title')}</span>
                </CardTitle>
                <CardDescription>
                  {t('dealer.view.overview.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DealerOverview dealerId={id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>{t('dealer.view.groups.title')}</span>
                </CardTitle>
                <CardDescription>
                  {t('dealer.view.groups.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DealerGroups dealerId={id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
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

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="h-5 w-5" />
                  <span>{t('categories.title')}</span>
                </CardTitle>
                <CardDescription>
                  {t('categories.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DealerCategories dealerId={id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <DealerModules dealerId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DealerView;