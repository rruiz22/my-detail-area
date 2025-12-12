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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Monitor, Settings, Camera, AlertTriangle, CheckCircle, Plus, Edit, Trash2, Activity, Info, ExternalLink, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";

// REAL DATABASE INTEGRATION
import {
  useDetailHubKiosks,
  useKioskStatistics,
  useCreateKiosk,
  useUpdateKiosk,
  useDeleteKiosk,
  useArchiveKiosk, // ✅ NEW
  generateKioskCode,
  type DetailHubKiosk
} from "@/hooks/useDetailHubKiosks";
import { useDetailHubEmployees } from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  // Tab state with persistence
  const [activeTab, setActiveTab] = useTabPersistence('kiosk_manager');

  // Physical kiosk states
  const [isAddingKiosk, setIsAddingKiosk] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<DetailHubKiosk | null>(null);
  const [viewingKiosk, setViewingKiosk] = useState<DetailHubKiosk | null>(null);
  const [remoteKioskModalOpen, setRemoteKioskModalOpen] = useState(false);
  const [kioskToArchive, setKioskToArchive] = useState<string | null>(null);

  // Remote token states
  const [viewingToken, setViewingToken] = useState<RemoteKioskToken | null>(null);

  // Search/filter state
  const [searchTerm, setSearchTerm] = useState("");

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
  const { mutate: archiveKiosk } = useArchiveKiosk(); // ✅ CHANGED: Use archive instead of delete

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
        return <Badge className="bg-green-100 text-green-800">{t('detail_hub.kiosk_manager.camera_status_values.active')}</Badge>;
      case "inactive":
        return <Badge variant="secondary">{t('detail_hub.kiosk_manager.camera_status_values.inactive')}</Badge>;
      case "error":
        return <Badge variant="destructive">{t('detail_hub.kiosk_manager.camera_status_values.error')}</Badge>;
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
      toast({
        title: "Dealership Required",
        description: "Please select a specific dealership",
        variant: "destructive"
      });
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
    setKioskToArchive(id);
  };

  const confirmArchive = () => {
    if (kioskToArchive) {
      archiveKiosk(kioskToArchive);
      setKioskToArchive(null);
    }
  };

  // Filter kiosks based on search term
  const filteredKiosks = kiosks.filter((kiosk) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      kiosk.name.toLowerCase().includes(search) ||
      kiosk.kiosk_code.toLowerCase().includes(search) ||
      (kiosk.location && kiosk.location.toLowerCase().includes(search))
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for stats cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton for kiosks table */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiosk</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Camera</TableHead>
                  <TableHead className="hidden md:table-cell">Last Ping</TableHead>
                  <TableHead className="hidden lg:table-cell">Today's Punches</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
    <TooltipProvider>
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
            {t('detail_hub.kiosk_manager.generate_remote_kiosk', { defaultValue: 'Generate Remote Kiosk' })}
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
          <div className="flex items-center justify-between">
            <CardTitle>Kiosks ({filteredKiosks.length}{searchTerm && ` of ${kiosks.length}`})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredKiosks.length === 0 ? (
            <div className="text-center py-12">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No kiosks match "{searchTerm}"</p>
                  <Button
                    variant="link"
                    onClick={() => setSearchTerm("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No kiosks configured</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiosk</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Camera</TableHead>
                  <TableHead className="hidden md:table-cell">Last Ping</TableHead>
                  <TableHead className="hidden lg:table-cell">Today's Punches</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKiosks.map((kiosk) => (
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
                    <TableCell className="hidden md:table-cell">
                      <p>{kiosk.location || 'Not set'}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(kiosk.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getCameraStatusBadge(kiosk.camera_status)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {kiosk.last_ping
                          ? `${formatDistanceToNow(new Date(kiosk.last_ping), { addSuffix: true })}`
                          : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-medium">{kiosk.punches_today}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingKiosk(kiosk)}
                            >
                              <Info className="w-4 h-4 text-blue-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Details</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(kiosk)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Configuration</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKiosk(kiosk.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Archive Kiosk</p>
                          </TooltipContent>
                        </Tooltip>
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

      {/* Remote Kiosk Access Generator - Outside tabs so it works from any tab */}
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
            phone: emp.phone,
          }))
        }
      />

      {/* Archive Kiosk Confirmation Dialog */}
      <AlertDialog open={!!kioskToArchive} onOpenChange={() => setKioskToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Archive this kiosk?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The kiosk will be hidden from the active list, but device bindings will be preserved.
              You can unarchive it later if needed.
              <br /><br />
              <strong>Note:</strong> Devices configured with this kiosk may need to be reconfigured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKioskToArchive(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} className="bg-amber-600 hover:bg-amber-700">
              Archive Kiosk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default KioskManager;
