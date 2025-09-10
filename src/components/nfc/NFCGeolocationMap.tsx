import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Navigation, 
  Zap, 
  Activity, 
  Clock, 
  Car, 
  RefreshCw,
  Maximize2,
  Filter,
  Search
} from 'lucide-react';
import { useNFCManagement } from '@/hooks/useNFCManagement';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NFCLocation {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  tag_count: number;
  recent_activity: number;
  vehicles: Array<{
    vin: string;
    make: string;
    model: string;
    last_scan: string;
  }>;
}

interface NFCGeolocationMapProps {
  className?: string;
}

export function NFCGeolocationMap({ className }: NFCGeolocationMapProps) {
  const { t } = useTranslation();
  const { tags, scans, loadTags, loadScans } = useNFCManagement();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<NFCLocation | null>(null);
  const [locations, setLocations] = useState<NFCLocation[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'recent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapMode, setMapMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    loadTags();
    loadScans();
  }, []);

  useEffect(() => {
    // Generate mock locations with real-looking data
    const mockLocations: NFCLocation[] = [
      {
        id: 'service-bay-1',
        name: 'Service Bay 1',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        tag_count: 12,
        recent_activity: 8,
        vehicles: [
          { vin: '1HGBH41JXMN109186', make: 'Honda', model: 'Civic', last_scan: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
          { vin: '1FTFW1ET5DFC10312', make: 'Ford', model: 'F-150', last_scan: new Date(Date.now() - 1000 * 60 * 45).toISOString() }
        ]
      },
      {
        id: 'service-bay-2',
        name: 'Service Bay 2',
        coordinates: { lat: 40.7130, lng: -74.0058 },
        tag_count: 8,
        recent_activity: 15,
        vehicles: [
          { vin: '2T1BURHE0JC014906', make: 'Toyota', model: 'Corolla', last_scan: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
        ]
      },
      {
        id: 'detail-area',
        name: 'Detail Area',
        coordinates: { lat: 40.7125, lng: -74.0065 },
        tag_count: 15,
        recent_activity: 23,
        vehicles: [
          { vin: '1G1BE5SM3J7123456', make: 'Chevrolet', model: 'Cruze', last_scan: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
          { vin: '3VWD07AJ5EM123456', make: 'Volkswagen', model: 'Jetta', last_scan: new Date(Date.now() - 1000 * 60 * 12).toISOString() }
        ]
      },
      {
        id: 'parking-lot',
        name: 'Customer Parking',
        coordinates: { lat: 40.7132, lng: -74.0062 },
        tag_count: 25,
        recent_activity: 5,
        vehicles: [
          { vin: '5NPE34AF2JH123456', make: 'Hyundai', model: 'Elantra', last_scan: new Date(Date.now() - 1000 * 60 * 30).toISOString() }
        ]
      }
    ];
    
    setLocations(mockLocations);
  }, [tags, scans]);

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    switch (filterType) {
      case 'active':
        return matchesSearch && location.vehicles.length > 0;
      case 'recent':
        return matchesSearch && location.recent_activity > 0;
      default:
        return matchesSearch;
    }
  });

  const getActivityColor = (activity: number) => {
    if (activity >= 20) return 'bg-success text-success-foreground';
    if (activity >= 10) return 'bg-warning text-warning-foreground';
    if (activity >= 5) return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return t('nfc_geolocation.just_now');
    if (minutes < 60) return t('nfc_geolocation.minutes_ago', { count: minutes });
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('nfc_geolocation.hours_ago', { count: hours });
    
    const days = Math.floor(hours / 24);
    return t('nfc_geolocation.days_ago', { count: days });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {t('nfc_geolocation.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('nfc_geolocation.subtitle')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={mapMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapMode('list')}
              >
                <Activity className="w-4 h-4 mr-2" />
                {t('nfc_geolocation.list_view')}
              </Button>
              <Button
                variant={mapMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapMode('map')}
                disabled
              >
                <Navigation className="w-4 h-4 mr-2" />
                {t('nfc_geolocation.map_view')}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('nfc_geolocation.search_locations')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('nfc_geolocation.all_locations')}</SelectItem>
                <SelectItem value="active">{t('nfc_geolocation.active_only')}</SelectItem>
                <SelectItem value="recent">{t('nfc_geolocation.recent_activity')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{locations.length}</p>
              <p className="text-xs text-muted-foreground">{t('nfc_geolocation.total_locations')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-success">
                {locations.filter(l => l.vehicles.length > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">{t('nfc_geolocation.active_locations')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-warning">
                {locations.reduce((sum, l) => sum + l.tag_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">{t('nfc_geolocation.total_tags')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-secondary">
                {locations.reduce((sum, l) => sum + l.vehicles.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">{t('nfc_geolocation.tracked_vehicles')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations List */}
      {mapMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLocations.map((location) => (
            <Card 
              key={location.id} 
              className={cn(
                "cursor-pointer hover:shadow-md transition-all duration-200",
                selectedLocation?.id === location.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedLocation(location)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{location.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {location.tag_count} {t('nfc_geolocation.tags_deployed')}
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={getActivityColor(location.recent_activity)}>
                    <Zap className="w-3 h-3 mr-1" />
                    {location.recent_activity}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Current Vehicles */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {t('nfc_geolocation.current_vehicles')} ({location.vehicles.length})
                    </span>
                  </div>
                  
                  {location.vehicles.length > 0 ? (
                    <div className="space-y-2">
                      {location.vehicles.slice(0, 2).map((vehicle, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                          <div>
                            <p className="text-sm font-medium">
                              {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {vehicle.vin.slice(-6)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(vehicle.last_scan)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {location.vehicles.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{location.vehicles.length - 2} {t('nfc_geolocation.more_vehicles')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t('nfc_geolocation.no_vehicles')}
                    </p>
                  )}
                </div>

                {/* Activity Indicator */}
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {t('nfc_geolocation.recent_activity')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Activity className={cn(
                      "w-4 h-4",
                      location.recent_activity > 10 ? "text-success" : "text-muted-foreground"
                    )} />
                    <span className="font-medium">
                      {location.recent_activity} {t('nfc_geolocation.scans_today')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Map Placeholder - Would integrate with actual mapping service */}
      {mapMode === 'map' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Navigation className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{t('nfc_geolocation.map_coming_soon')}</h3>
              <p className="text-muted-foreground">
                {t('nfc_geolocation.map_description')}
              </p>
              <Button variant="outline">
                <Maximize2 className="w-4 h-4 mr-2" />
                {t('nfc_geolocation.request_integration')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {filteredLocations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('nfc_geolocation.no_locations_found')}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? t('nfc_geolocation.no_search_results') 
                : t('nfc_geolocation.no_locations_available')
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}