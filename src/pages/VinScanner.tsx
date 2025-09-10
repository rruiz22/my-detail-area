import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { QrCode, Camera, Upload, History, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function VinScanner() {
  const { t } = useTranslation();

  const handleVinSelected = (vin: string) => {
    console.log('VIN selected:', vin);
    // Here you could navigate to order creation with the VIN pre-filled
    // or trigger any other action needed
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('vin_scanner_hub.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('vin_scanner_hub.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Quick Mode
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  VIN Scanner
                </CardTitle>
                <CardDescription>Scan vehicle VIN codes using camera or upload</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                    <Camera className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Ready to Scan</h3>
                  <p className="text-muted-foreground">
                    Use your camera to scan VIN codes or upload an image
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" className="button-enhanced">
                      <Camera className="w-5 h-5 mr-2" />
                      Start Camera
                    </Button>
                    <Button variant="outline" size="lg">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                  <Badge variant="outline" className="mt-4">
                    Advanced scanning features coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Scan Mode</CardTitle>
                <CardDescription>Fast VIN detection with instant results</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Quick Scan</h3>
                <p className="text-sm text-muted-foreground">Enhanced scanning features coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>Previous VIN scanning sessions</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No History Yet</h3>
                <p className="text-sm text-muted-foreground">Your scan history will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scanning Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">Detailed analytics coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}