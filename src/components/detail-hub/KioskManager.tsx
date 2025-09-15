import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Settings, Camera, Wifi, Battery, MapPin, AlertTriangle, CheckCircle, Plus, Edit, Trash2 } from "lucide-react";

const KioskManager = () => {
  const { t } = useTranslation();
  const [isAddingKiosk, setIsAddingKiosk] = useState(false);

  const kiosks = [
    {
      id: "KIOSK-001",
      name: "Main Entrance",
      location: "Detail Department - Front Door",
      status: "Online",
      ipAddress: "192.168.1.101",
      lastPing: "2024-12-12 14:32:15",
      cameraStatus: "Active",
      faceRecognition: true,
      autoSleep: true,
      sleepTime: 30,
      brightnesss: 80,
      volume: 75,
      kioskMode: true,
      allowManualEntry: true,
      requirePhoto: false,
      totalPunches: 145,
      todayPunches: 23
    },
    {
      id: "KIOSK-002", 
      name: "Break Room",
      location: "Detail Department - Break Area",
      status: "Online",
      ipAddress: "192.168.1.102",
      lastPing: "2024-12-12 14:31:48",
      cameraStatus: "Active",
      faceRecognition: true,
      autoSleep: true,
      sleepTime: 15,
      brightnesss: 70,
      volume: 60,
      kioskMode: true,
      allowManualEntry: true,
      requirePhoto: false,
      totalPunches: 89,
      todayPunches: 12
    },
    {
      id: "KIOSK-003",
      name: "Car Wash Station",
      location: "Car Wash - Bay 1",
      status: "Offline",
      ipAddress: "192.168.1.103",
      lastPing: "2024-12-12 13:45:22",
      cameraStatus: "Inactive",
      faceRecognition: false,
      autoSleep: false,
      sleepTime: 0,
      brightnesss: 90,
      volume: 80,
      kioskMode: true,
      allowManualEntry: true,
      requirePhoto: true,
      totalPunches: 67,
      todayPunches: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Online":
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case "Offline":
        return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
      case "Warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Online":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Offline":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-600" />;
    }
  };

  const systemStats = {
    totalKiosks: kiosks.length,
    onlineKiosks: kiosks.filter(k => k.status === 'Online').length,
    totalPunchesToday: kiosks.reduce((sum, k) => sum + k.todayPunches, 0),
    averageUptime: 98.5
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kiosk Manager</h1>
          <p className="text-muted-foreground">Configure and monitor time clock kiosks</p>
        </div>
        <Dialog open={isAddingKiosk} onOpenChange={setIsAddingKiosk}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Kiosk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Kiosk</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kioskName">Kiosk Name</Label>
                  <Input id="kioskName" placeholder="Main Entrance" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kioskId">Kiosk ID</Label>
                  <Input id="kioskId" placeholder="KIOSK-004" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Detail Department - Front Door" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input id="ipAddress" placeholder="192.168.1.104" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brightness">Screen Brightness (%)</Label>
                  <Input id="brightness" type="number" placeholder="80" min="10" max="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume">Volume (%)</Label>
                  <Input id="volume" type="number" placeholder="75" min="0" max="100" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="faceRecognition">Enable Face Recognition</Label>
                  <Switch id="faceRecognition" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="kioskMode">Kiosk Mode</Label>
                  <Switch id="kioskMode" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowManual">Allow Manual Entry</Label>
                  <Switch id="allowManual" defaultChecked />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingKiosk(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddingKiosk(false)}>
                Add Kiosk
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Kiosks</p>
                <p className="text-2xl font-bold">{systemStats.totalKiosks}</p>
              </div>
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-green-600">{systemStats.onlineKiosks}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Punches</p>
                <p className="text-2xl font-bold">{systemStats.totalPunchesToday}</p>
              </div>
              <Battery className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Uptime</p>
                <p className="text-2xl font-bold">{systemStats.averageUptime}%</p>
              </div>
              <Wifi className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kiosk Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kiosk</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Camera</TableHead>
                    <TableHead>Today</TableHead>
                    <TableHead>Last Ping</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kiosks.map((kiosk) => (
                    <TableRow key={kiosk.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(kiosk.status)}
                          <div>
                            <p className="font-medium">{kiosk.name}</p>
                            <p className="text-sm text-muted-foreground">{kiosk.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{kiosk.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(kiosk.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Camera className={`w-4 h-4 ${kiosk.cameraStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="text-sm">{kiosk.cameraStatus}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {kiosk.todayPunches} punches
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {kiosk.lastPing}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="globalFaceRecognition">Global Face Recognition</Label>
                  <Switch id="globalFaceRecognition" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoUpdate">Auto Update Kiosks</Label>
                  <Switch id="autoUpdate" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="centralLogging">Central Logging</Label>
                  <Switch id="centralLogging" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultSleepTime">Default Sleep Time (minutes)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="0">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="requirePhoto">Require Photo for Punches</Label>
                  <Switch id="requirePhoto" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="restrictAccess">Restrict Access Hours</Label>
                  <Switch id="restrictAccess" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auditLogging">Enhanced Audit Logging</Label>
                  <Switch id="auditLogging" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Failed Attempts</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                      <SelectItem value="10">10 attempts</SelectItem>
                      <SelectItem value="0">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Maintenance tools and logs coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KioskManager;