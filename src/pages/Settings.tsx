import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Database, Mail, MessageSquare } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { StorageDevTools } from "@/components/dev/StorageDevTools";
import { developmentConfig } from "@/config/development";

export default function Settings() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6 max-w-4xl">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.general_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealership">{t('settings.dealership_name')}</Label>
                <Input id="dealership" placeholder={t('placeholders.enter_dealership_name')} defaultValue="Premium Auto Group" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('settings.location')}</Label>
                <Input id="location" placeholder={t('placeholders.enter_location')} defaultValue="Miami, FL" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t('settings.address')}</Label>
              <Input id="address" placeholder={t('placeholders.enter_full_address')} defaultValue="123 Auto Plaza Blvd, Miami, FL 33101" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('settings.notification_settings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.email_notifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.email_alerts_description')}
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.sms_notifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.sms_description')}
                </p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.in_app_alerts')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.toast_description')}
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('settings.integrations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{t('settings.database_backend')}</h4>
                <Button variant="outline" size="sm">
                  {t('settings.connect_supabase')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.supabase_description')}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{t('settings.vin_decoding_api')}</h4>
                <Button variant="outline" size="sm" disabled>
                  {t('settings.configure')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.vin_api_description')}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{t('settings.photo_management')}</h4>
                <Button variant="outline" size="sm" disabled>
                  {t('settings.configure')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.photo_description')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Development Tools - Only shown in development mode */}
        {developmentConfig.features.enableStorageDebug && (
          <StorageDevTools />
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            {t('settings.save_settings')}
          </Button>
        </div>
    </div>
  );
}