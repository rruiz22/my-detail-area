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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Monitor, Settings, Camera, AlertTriangle, CheckCircle, Plus, Edit, Trash2, Activity, Info, ExternalLink } from "lucide-react";
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
import { useDetailHubEmployees } from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import { KioskDetailModal } from "./KioskDetailModal";
import { GenerateRemoteKioskModal } from "./GenerateRemoteKioskModal";

// Remote Kiosk Token Management
import { RemoteKioskTokenStats } from "./RemoteKioskTokenStats";
import { RemoteKioskTokenList } from "./RemoteKioskTokenList";
import { RemoteKioskTokenDetailModal } from "./RemoteKioskTokenDetailModal";
import { RemoteKioskTokenCharts } from "./RemoteKioskTokenCharts";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import type { RemoteKioskToken } from "@/hooks/useRemoteKioskTokens";

const KioskManager = () => {
  const { t } = useTranslation();

  // Tab state with persistence
  const [activeTab, setActiveTab] = useTabPersistence('kiosk_manager');

  // Physical kiosk states
  const [isAddingKiosk, setIsAddingKiosk] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<DetailHubKiosk | null>(null);
  const [viewingKiosk, setViewingKiosk] = useState<DetailHubKiosk | null>(null);
  const [remoteKioskModalOpen, setRemoteKioskModalOpen] = useState(false);

  // Remote token states
  const [viewingToken, setViewingToken] = useState<RemoteKioskToken | null>(null);

  // Form state - Simplified (removed unused fields: IP, MAC, brightness, volume, kioskMode)
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [faceRecognition, setFaceRecognition] = useState(true);
  const [allowManualEntry, setAllowManualEntry] = useState(true);
  const [sleepTimeout, setSleepTimeout] = useState(10); // Changed default from 30 to 10 seconds

  const { selectedDealerId } = useDealerFilter();

  // REAL DATABASE INTEGRATION
  const { data: kiosks = [], isLoading, error } = useDetailHubKiosks();
  const { data: stats } = useKioskStatistics();
  const { data: employees = [] } = useDetailHubEmployees();
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
    setFaceRecognition(true);
    setAllowManualEntry(true);
    setSleepTimeout(10);
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
      // Functional toggles that are actually used by PunchClockKioskModal
      face_recognition_enabled: faceRecognition,
      allow_manual_entry: allowManualEntry,
      sleep_timeout_minutes: sleepTimeout,
      // Status fields
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
        // Functional toggles
        face_recognition_enabled: faceRecognition,
        allow_manual_entry: allowManualEntry,
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
    setFaceRecognition(kiosk.face_recognition_enabled);
    setAllowManualEntry(kiosk.allow_manual_entry);
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
        <div className="flex gap-2">
          <Button
            onClick={() => setRemoteKioskModalOpen(true)}
            variant="outline"
            disabled={selectedDealerId === 'all'}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('detail_hub.kiosk_manager.generate_remote_access')}
          </Button>
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
              <DialogDescription>
                {editingKiosk
                  ? t('detail_hub.kiosk_manager.edit_description')
                  : t('detail_hub.kiosk_manager.add_description')
                }
              </DialogDescription>
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

              {/* Functional Configuration Toggles */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="faceRecognition">{t('detail_hub.kiosk_manager.features.face_recognition_enabled')}</Label>
                    <p className="text-xs text-muted-foreground">Enable facial recognition for employee login</p>
                  </div>
                  <Switch
                    id="faceRecognition"
                    checked={faceRecognition}
                    onCheckedChange={setFaceRecognition}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="allowManual">Allow Manual Entry</Label>
                    <p className="text-xs text-muted-foreground">Allow employees to search and login manually</p>
                  </div>
                  <Switch
                    id="allowManual"
                    checked={allowManualEntry}
                    onCheckedChange={setAllowManualEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sleepTimeout">Auto-Logout Timeout (seconds)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Automatically return to search after employee action (10 seconds recommended)
                  </p>
                  <Input
                    id="sleepTimeout"
                    type="number"
                    min="5"
                    max="60"
                    value={sleepTimeout}
                    onChange={(e) => setSleepTimeout(parseInt(e.target.value))}
                  />
                </div>
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
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="physical">
            <Monitor className="w-4 h-4 mr-2" />
            {t('detail_hub.kiosk_manager.tab_physical_kiosks', { defaultValue: 'Physical Kiosks' })}
          </TabsTrigger>
          <TabsTrigger value="remote">
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('remote_kiosk_management.tab_name')}
          </TabsTrigger>
        </TabsList>

        {/* Physical Kiosks Tab */}
        <TabsContent value="physical" className="space-y-6 mt-6">
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
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingKiosk(kiosk)}
                          title="View Details"
                        >
                          <Info className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(kiosk)}
                          title="Edit Configuration"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKiosk(kiosk.id)}
                          title="Delete Kiosk"
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

      {/* Kiosk Detail Modal */}
      <KioskDetailModal
        kiosk={viewingKiosk}
        open={!!viewingKiosk}
        onClose={() => setViewingKiosk(null)}
      />

      {/* Remote Kiosk Access Generator */}
      <GenerateRemoteKioskModal
        open={remoteKioskModalOpen}
        onClose={() => setRemoteKioskModalOpen(false)}
        dealershipId={selectedDealerId === 'all' ? 0 : Number(selectedDealerId)}
        employees={employees
          .filter((emp) => emp.status === 'active')
          .map((emp) => ({
            id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            employee_number: emp.employee_number,
          }))
        }
      />
        </TabsContent>

        {/* Remote Tokens Tab */}
        <TabsContent value="remote" className="space-y-6 mt-6">
          {/* Token Statistics */}
          <RemoteKioskTokenStats />

          {/* Analytics Charts */}
          <RemoteKioskTokenCharts />

          {/* Token List */}
          <RemoteKioskTokenList onViewDetails={setViewingToken} />

          {/* Token Detail Modal */}
          <RemoteKioskTokenDetailModal
            token={viewingToken}
            open={!!viewingToken}
            onClose={() => setViewingToken(null)}
            onCopyUrl={async (token) => {
              try {
                await navigator.clipboard.writeText(token.full_url);
                // Toast will be shown by the button click handler
              } catch (err) {
                console.error('Failed to copy URL:', err);
              }
              setViewingToken(null);
            }}
            onRevoke={(token) => {
              setViewingToken(null);
              // Revoke logic will be handled by RemoteKioskTokenList
            }}
            onDelete={(token) => {
              setViewingToken(null);
              // Delete logic will be handled by RemoteKioskTokenList
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KioskManager;
