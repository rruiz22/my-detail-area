import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Car, 
  MapPin, 
  Navigation, 
  Clock,
  Search,
  Route,
  History,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNFCManagement } from '@/hooks/useNFCManagement';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NFCVehicleTrackerProps {
  className?: string;
}

interface VehicleLocation {
  id: string;
  vehicle_vin: string;
  vehicle_info?: string;
  current_location: string;
  coordinates?: [number, number];
  last_updated: string;
  status: 'in_process' | 'waiting' | 'completed' | 'moved';
  stage: string;
  estimated_completion?: string;
  progress_percentage: number;
}

interface LocationHistory {
  location: string;
  timestamp: string;
  duration: number; // in minutes
  status: string;
  notes?: string;
}

export function NFCVehicleTracker({ className }: NFCVehicleTrackerProps) {
  const { t, i18n } = useTranslation();
  const { vehicleTags, scans, loadTags, loadScans } = useNFCManagement();
  
  const [searchVin, setSearchVin] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  useEffect(() => {
    loadTags();
    loadScans();
  }, [loadTags, loadScans]);

  // Mock vehicle location data - in real app this would come from NFC scan aggregation
  const mockVehicleLocations: VehicleLocation[] = vehicleTags
    .filter(tag => tag.vehicle_vin)
    .map(tag => ({
      id: tag.id,
      vehicle_vin: tag.vehicle_vin!,
      vehicle_info: `2024 ${tag.name}`,
      current_location: tag.location_name || 'Service Bay 1',
      coordinates: tag.location_coordinates,
      last_updated: tag.last_scanned_at || tag.created_at,
      status: ['in_process', 'waiting', 'completed', 'moved'][Math.floor(Math.random() * 4)] as any,
      stage: ['Reception', 'Wash Bay', 'Detail Bay', 'Quality Check', 'Ready for Pickup'][Math.floor(Math.random() * 5)],
      estimated_completion: new Date(Date.now() + Math.random() * 4 * 60 * 60 * 1000).toISOString(),
      progress_percentage: Math.floor(Math.random() * 100)
    }));

  // Filter vehicles based on search
  const filteredVehicles = mockVehicleLocations.filter(vehicle =>
    vehicle.vehicle_vin.toLowerCase().includes(searchVin.toLowerCase()) ||
    vehicle.vehicle_info?.toLowerCase().includes(searchVin.toLowerCase())
  );

  // Mock location history for selected vehicle
  const generateLocationHistory = (vehicleId: string): LocationHistory[] => {
    const locations = ['Reception', 'Wash Bay 1', 'Detail Bay 2', 'Quality Check', 'Ready Zone'];
    return locations.map((location, index) => ({
      location,
      timestamp: new Date(Date.now() - (locations.length - index) * 60 * 60 * 1000).toISOString(),
      duration: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
      status: index < locations.length - 1 ? 'completed' : 'current',
      notes: index === 2 ? 'Additional paint correction required' : undefined
    }));
  };

  useEffect(() => {
    if (selectedVehicle) {
      setLocationHistory(generateLocationHistory(selectedVehicle));
    }
  }, [selectedVehicle]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_process': return 'bg-primary text-primary-foreground';
      case 'waiting': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'moved': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_process': return <Activity className="w-3 h-3" />;
      case 'waiting': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'moved': return <Navigation className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('nfc_tracking.vehicle_tracker.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('nfc_tracking.vehicle_tracker.subtitle')}
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('nfc_tracking.vehicle_tracker.search_placeholder')}
            value={searchVin}
            onChange={(e) => setSearchVin(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {t('nfc_tracking.vehicle_tracker.tracked_vehicles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                      selectedVehicle === vehicle.id ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{vehicle.vehicle_info}</p>
                        <p className="text-xs text-muted-foreground">VIN: {vehicle.vehicle_vin}</p>
                      </div>
                      <Badge className={cn("ml-2", getStatusColor(vehicle.status))}>
                        {getStatusIcon(vehicle.status)}
                        <span className="ml-1 capitalize">{vehicle.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{vehicle.current_location}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('nfc_tracking.vehicle_tracker.progress')}</span>
                        <span>{vehicle.progress_percentage}%</span>
                      </div>
                      <Progress value={vehicle.progress_percentage} className="h-1" />
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      {t('nfc_tracking.vehicle_tracker.last_update')}: {formatDistanceToNow(new Date(vehicle.last_updated), { 
                        addSuffix: true, 
                        locale: getLocale() 
                      })}
                    </div>
                  </div>
                ))}
                
                {filteredVehicles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchVin ? t('nfc_tracking.vehicle_tracker.no_results') : t('nfc_tracking.vehicle_tracker.no_vehicles')}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Vehicle Details and Location History */}
        <div className="lg:col-span-2 space-y-6">
          {selectedVehicle ? (
            <>
              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-primary" />
                    {t('nfc_tracking.vehicle_tracker.current_status')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const vehicle = filteredVehicles.find(v => v.id === selectedVehicle);
                    if (!vehicle) return null;

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">{t('nfc_tracking.vehicle_tracker.vehicle')}</p>
                              <p className="text-lg">{vehicle.vehicle_info}</p>
                              <p className="text-xs text-muted-foreground">VIN: {vehicle.vehicle_vin}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium">{t('nfc_tracking.vehicle_tracker.current_location')}</p>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{vehicle.current_location}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">{t('nfc_tracking.vehicle_tracker.current_stage')}</p>
                              <Badge className={getStatusColor(vehicle.status)}>
                                {getStatusIcon(vehicle.status)}
                                <span className="ml-1">{vehicle.stage}</span>
                              </Badge>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium">{t('nfc_tracking.vehicle_tracker.estimated_completion')}</p>
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-muted-foreground" />
                                <span>
                                  {vehicle.estimated_completion && formatDistanceToNow(new Date(vehicle.estimated_completion), { 
                                    addSuffix: true, 
                                    locale: getLocale() 
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>{t('nfc_tracking.vehicle_tracker.overall_progress')}</span>
                            <span>{vehicle.progress_percentage}%</span>
                          </div>
                          <Progress value={vehicle.progress_percentage} className="h-2" />
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Movement History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    {t('nfc_tracking.vehicle_tracker.movement_history')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {locationHistory.map((entry, index) => (
                        <div key={index} className="relative">
                          {index > 0 && (
                            <div className="absolute left-4 -top-2 w-px h-4 bg-border" />
                          )}
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                              entry.status === 'current' 
                                ? "border-primary bg-primary text-primary-foreground" 
                                : "border-success bg-success text-success-foreground"
                            )}>
                              {entry.status === 'current' ? (
                                <Activity className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium">{entry.location}</p>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(entry.timestamp), { 
                                    addSuffix: true, 
                                    locale: getLocale() 
                                  })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{entry.duration} {t('nfc_tracking.vehicle_tracker.minutes')}</span>
                                </div>
                                {entry.status === 'current' && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('nfc_tracking.vehicle_tracker.current_location')}
                                  </Badge>
                                )}
                              </div>
                              
                              {entry.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {index < locationHistory.length - 1 && (
                            <div className="absolute left-4 bottom-0 w-px h-4 bg-border" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Route className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  {t('nfc_tracking.vehicle_tracker.select_vehicle')}
                </h3>
                <p className="text-muted-foreground">
                  {t('nfc_tracking.vehicle_tracker.select_vehicle_desc')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}