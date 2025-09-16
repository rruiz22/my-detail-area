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
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealership">Dealership Name</Label>
                <Input id="dealership" placeholder={t('placeholders.enter_dealership_name')} defaultValue="Premium Auto Group" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder={t('placeholders.enter_location')} defaultValue="Miami, FL" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder={t('placeholders.enter_full_address')} defaultValue="123 Auto Plaza Blvd, Miami, FL 33101" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for order status changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send SMS when orders are completed (requires Twilio integration)
                </p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>In-App Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Show toast notifications in the application
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
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Database & Backend</h4>
                <Button variant="outline" size="sm">
                  Connect Supabase
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect to Supabase for full database functionality, user authentication, 
                and advanced features like SMS notifications and file storage.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">VIN Decoding API</h4>
                <Button variant="outline" size="sm" disabled>
                  Configure
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                MarketCheck API integration for automatic VIN decoding
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Photo Management</h4>
                <Button variant="outline" size="sm" disabled>
                  Configure
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                CarCutter / Amazon S3 integration for photo management
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
            Save Settings
          </Button>
        </div>
    </div>
  );
}