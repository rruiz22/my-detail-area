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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Monitor, Settings, Camera, AlertTriangle, CheckCircle, Plus, Edit, Trash2, Activity } from "lucide-react";
import { format } from "date-fns";

// REAL DATABASE INTEGRATION
import {
  useDetailHubKiosks,
  useKioskStatistics,
  useCreateKiosk,
  useUpdateKiosk,
  useDeleteKiosk,
  generateKioskCode,
  type DetailHubKiosk
} from "@/hooks/useDetailHubKiosks";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

const KioskManager = () => {
  const { t } = useTranslation();
  const [isAddingKiosk, setIsAddingKiosk] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<DetailHubKiosk | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [brightness, setBrightness] = useState(80);
  const [volume, setVolume] = useState(75);
  const [faceRecognition, setFaceRecognition] = useState(true);
  const [kioskMode, setKioskMode] = useState(true);
  const [allowManualEntry, setAllowManualEntry] = useState(true);
  const [autoSleep, setAutoSleep] = useState(true);
  const [sleepTimeout, setSleepTimeout] = useState(30);

  const { selectedDealerId } = useDealerFilter();

  // REAL DATABASE INTEGRATION
  const { data: kiosks = [], isLoading, error } = useDetailHubKiosks();
  const { data: stats } = useKioskStatistics();
  const { mutate: createKiosk, isPending: isCreating } = useCreateKiosk();
  const { mutate: updateKiosk, isPending: isUpdating } = useUpdateKiosk();
  const { mutate: deleteKiosk } = useDeleteKiosk();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-100 text-green-800">{t('detail_hub.kiosk_manager.status_values.online')}</Badge>;
      case "offline":
        return <Badge className="bg-red-100 text-red-800">{t('detail_hub.kiosk_manager.status_values.offline')}</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">{t('common.status.warning')}</Badge>;
      case "maintenance":
        return <Badge variant="secondary">Maintenance</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "offline":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCameraStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resetForm = () => {
    setName("");
    setLocation("");
    setIpAddress("");
    setMacAddress("");
    setBrightness(80);
    setVolume(75);
    setFaceRecognition(true);
    setKioskMode(true);
    setAllowManualEntry(true);
    setAutoSleep(true);
    setSleepTimeout(30);
    setEditingKiosk(null);
  };

  const handleCreateKiosk = async () => {
    if (selectedDealerId === 'all') {
      alert('Please select a specific dealership');
      return;
    }

    // Generate kiosk code
    const kioskCode = await generateKioskCode(selectedDealerId);

    createKiosk({
      dealership_id: selectedDealerId,
      kiosk_code: kioskCode,
      name,
      location: location || null,
      ip_address: ipAddress || null,
      mac_address: macAddress || null,
      screen_brightness: brightness,
      volume,
      face_recognition_enabled: faceRecognition,
      kiosk_mode: kioskMode,
      allow_manual_entry: allowManualEntry,
      auto_sleep: autoSleep,
      sleep_timeout_minutes: sleepTimeout,
      status: 'offline', // Default to offline until first heartbeat
      camera_status: 'inactive'
    }, {
      onSuccess: () => {
        setIsAddingKiosk(false);
        resetForm();
      }
    });
  };

  const handleUpdateKiosk = () => {
    if (!editingKiosk) return;

    updateKiosk({
      id: editingKiosk.id,
      updates: {
        name,
        location: location || null,
        ip_address: ipAddress || null,
        mac_address: macAddress || null,
        screen_brightness: brightness,
        volume,
        face_recognition_enabled: faceRecognition,
        kiosk_mode: kioskMode,
        allow_manual_entry: allowManualEntry,
        auto_sleep: autoSleep,
        sleep_timeout_minutes: sleepTimeout
      }
    }, {
      onSuccess: () => {
        setEditingKiosk(null);
        resetForm();
      }
    });
  };

  const handleEdit = (kiosk: DetailHubKiosk) => {
    setEditingKiosk(kiosk);
    setName(kiosk.name);
    setLocation(kiosk.location || "");
    setIpAddress(kiosk.ip_address || "");
    setMacAddress(kiosk.mac_address || "");
    setBrightness(kiosk.screen_brightness);
    setVolume(kiosk.volume);
    setFaceRecognition(kiosk.face_recognition_enabled);
    setKioskMode(kiosk.kiosk_mode);
    setAllowManualEntry(kiosk.allow_manual_entry);
    setAutoSleep(kiosk.auto_sleep);
    setSleepTimeout(kiosk.sleep_timeout_minutes);
  };

  const handleDeleteKiosk = (id: string) => {
    if (confirm('Are you sure you want to delete this kiosk?')) {
      deleteKiosk(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading kiosks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Error loading kiosks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.kiosk_manager.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.kiosk_manager.subtitle')}</p>
        </div>
        <Dialog open={isAddingKiosk || !!editingKiosk} onOpenChange={(open) => {
          if (!open) {
            setIsAddingKiosk(false);
            setEditingKiosk(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingKiosk(true)} disabled={selectedDealerId === 'all'}>
              <Plus className="w-4 h-4 mr-2" />
              {t('detail_hub.kiosk_manager.add_kiosk')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingKiosk ? 'Edit Kiosk' : t('detail_hub.kiosk_manager.add_kiosk')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kioskName">{t('detail_hub.kiosk_manager.kiosk_name')}</Label>
                  <Input
                    id="kioskName"
                    placeholder="Main Entrance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                {editingKiosk && (
                  <div className="space-y-2">
                    <Label>{t('detail_hub.kiosk_manager.kiosk_code')}</Label>
                    <Input value={editingKiosk.kiosk_code} disabled className="bg-muted" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('detail_hub.kiosk_manager.location')}</Label>
                <Input
                  id="location"
                  placeholder="Detail Department - Front Door"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    placeholder="192.168.1.104"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="macAddress">MAC Address</Label>
                  <Input
                    id="macAddress"
                    placeholder="00:1A:2B:3C:4D:5E"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brightness">Screen Brightness ({brightness}%)</Label>
                  <Input
                    id="brightness"
                    type="range"
                    min="10"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume">Volume ({volume}%)</Label>
                  <Input
                    id="volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="faceRecognition">{t('detail_hub.kiosk_manager.features.face_recognition_enabled')}</Label>
                  <Switch
                    id="faceRecognition"
                    checked={faceRecognition}
                    onCheckedChange={setFaceRecognition}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="kioskMode">Kiosk Mode (Locked)</Label>
                  <Switch
                    id="kioskMode"
                    checked={kioskMode}
                    onCheckedChange={setKioskMode}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowManual">Allow Manual Entry</Label>
                  <Switch
                    id="allowManual"
                    checked={allowManualEntry}
                    onCheckedChange={setAllowManualEntry}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoSleep">Auto Sleep</Label>
                  <Switch
                    id="autoSleep"
                    checked={autoSleep}
                    onCheckedChange={setAutoSleep}
                  />
                </div>
                {autoSleep && (
                  <div className="space-y-2">
                    <Label htmlFor="sleepTimeout">Sleep Timeout (minutes)</Label>
                    <Input
                      id="sleepTimeout"
                      type="number"
                      min="1"
                      max="120"
                      value={sleepTimeout}
                      onChange={(e) => setSleepTimeout(parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddingKiosk(false);
                setEditingKiosk(null);
                resetForm();
              }}>
                {t('detail_hub.common.cancel')}
              </Button>
              <Button
                onClick={editingKiosk ? handleUpdateKiosk : handleCreateKiosk}
                disabled={(editingKiosk ? isUpdating : isCreating) || !name}
              >
                {editingKiosk
                  ? (isUpdating ? 'Updating...' : 'Update Kiosk')
                  : (isCreating ? 'Creating...' : t('detail_hub.kiosk_manager.add_kiosk'))
                }
              </Button>
            </DialogFooter>
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
                <p className="text-2xl font-bold">{stats?.total_kiosks || 0}</p>
              </div>
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online Kiosks</p>
                <p className="text-2xl font-bold text-green-600">{stats?.online_kiosks || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Punches Today</p>
                <p className="text-2xl font-bold">{stats?.total_punches_today || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Uptime</p>
                <p className="text-2xl font-bold">{(stats?.average_uptime || 0).toFixed(1)}%</p>
              </div>
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kiosks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kiosks ({kiosks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {kiosks.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No kiosks configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Last Ping</TableHead>
                  <TableHead>Today's Punches</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiosks.map((kiosk) => (
                  <TableRow key={kiosk.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(kiosk.status)}
                        <div>
                          <p className="font-medium">{kiosk.name}</p>
                          <p className="text-sm text-muted-foreground">{kiosk.kiosk_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{kiosk.location || 'Not set'}</p>
                      <p className="text-sm text-muted-foreground">{kiosk.ip_address || 'No IP'}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(kiosk.status)}</TableCell>
                    <TableCell>{getCameraStatusBadge(kiosk.camera_status)}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {kiosk.last_ping
                          ? format(new Date(kiosk.last_ping), 'MMM dd, HH:mm')
                          : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{kiosk.punches_today}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(kiosk)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKiosk(kiosk.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KioskManager;
