import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Nfc, MapPin, Tag, BarChart3, Activity, Clock, Users } from 'lucide-react';

export default function NFCTracking() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
              <Nfc className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('nfc_tracking.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('nfc_tracking.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('nfc_tracking.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {t('nfc_tracking.tag_manager')}
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t('nfc_tracking.vehicle_tracker')}
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('nfc_tracking.location_heatmap')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="w-5 h-5" />
                    Active Tags
                  </CardTitle>
                  <CardDescription>Currently active NFC tags</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">24</div>
                  <p className="text-sm text-success">+2 from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5" />
                    Total Scans
                  </CardTitle>
                  <CardDescription>Scans this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1,234</div>
                  <p className="text-sm text-success">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5" />
                    Locations
                  </CardTitle>
                  <CardDescription>Unique scan locations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">8</div>
                  <p className="text-sm text-muted-foreground">Across dealership</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">47</div>
                  <p className="text-sm text-warning">3 pending workflows</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 mt-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent NFC Scans</CardTitle>
                  <CardDescription>Latest NFC tag interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium">Vehicle #VH001</p>
                          <p className="text-sm text-muted-foreground">Detail Bay 1</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">2 min ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium">Vehicle #VH003</p>
                          <p className="text-sm text-muted-foreground">Wash Area</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">8 min ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium">Vehicle #VH005</p>
                          <p className="text-sm text-muted-foreground">Parking Lot</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">15 min ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Workflows</CardTitle>
                  <CardDescription>Automated NFC workflows in progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-success" />
                        <div>
                          <p className="font-medium">Detail Completion Alert</p>
                          <p className="text-sm text-muted-foreground">3 vehicles processed</p>
                        </div>
                      </div>
                      <span className="text-sm text-success">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-warning" />
                        <div>
                          <p className="font-medium">Location Tracking</p>
                          <p className="text-sm text-muted-foreground">Vehicle movement alerts</p>
                        </div>
                      </div>
                      <span className="text-sm text-warning">Pending</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle>NFC Tag Manager</CardTitle>
                <CardDescription>Create, edit and manage NFC tags for vehicle tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">NFC Tag Management</h3>
                  <p className="text-sm text-muted-foreground">Advanced tag management features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Tracker</CardTitle>
                <CardDescription>Real-time vehicle location and movement tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Vehicle Tracking</h3>
                  <p className="text-sm text-muted-foreground">Real-time tracking features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap">
            <Card>
              <CardHeader>
                <CardTitle>Location Heatmap</CardTitle>
                <CardDescription>Visualize popular areas and movement patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Location Heatmap</h3>
                  <p className="text-sm text-muted-foreground">Interactive heatmap visualization coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}