/**
 * Kiosk Detail Modal - Comprehensive Kiosk Information
 *
 * Shows detailed information about a specific kiosk including:
 * - Basic configuration and status
 * - Usage statistics (punches, uptime)
 * - Recent activity (employees who used it)
 * - Device information (if available)
 * - Configuration toggles
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor,
  MapPin,
  Activity,
  Users,
  Clock,
  Settings,
  Wifi,
  Camera,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { DetailHubKiosk } from '@/hooks/useDetailHubKiosks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface KioskDetailModalProps {
  kiosk: DetailHubKiosk | null;
  open: boolean;
  onClose: () => void;
}

interface KioskActivity {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
  method: string;
}

export function KioskDetailModal({ kiosk, open, onClose }: KioskDetailModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch recent activity for this kiosk
  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['kiosk-activity', kiosk?.id],
    queryFn: async () => {
      if (!kiosk?.id) return [];

      // Query time entries for clock in/out activities
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('detail_hub_time_entries')
        .select(`
          id,
          employee_id,
          clock_in,
          clock_out,
          punch_in_method,
          punch_out_method,
          employees:detail_hub_employees(first_name, last_name, employee_number)
        `)
        .eq('kiosk_id', kiosk.kiosk_code)
        .order('clock_in', { ascending: false })
        .limit(20);

      if (timeEntriesError) throw timeEntriesError;

      // Query breaks for this kiosk
      const { data: breaksData, error: breaksError } = await supabase
        .from('detail_hub_breaks')
        .select(`
          id,
          time_entry_id,
          employee_id,
          break_start,
          break_end,
          break_number,
          employees:detail_hub_employees(first_name, last_name, employee_number)
        `)
        .eq('kiosk_id', kiosk.kiosk_code)
        .order('break_start', { ascending: false })
        .limit(40);

      if (breaksError) throw breaksError;

      // Transform into activity timeline
      const activities: KioskActivity[] = [];

      // Add clock in/out activities
      timeEntriesData?.forEach((entry: any) => {
        if (entry.clock_in) {
          activities.push({
            id: `${entry.id}-in`,
            employee_id: entry.employee_id,
            employee_name: `${entry.employees?.first_name} ${entry.employees?.last_name}`,
            employee_number: entry.employees?.employee_number || 'N/A',
            action: 'clock_in',
            timestamp: entry.clock_in,
            method: entry.punch_in_method || 'unknown',
          });
        }
        if (entry.clock_out) {
          activities.push({
            id: `${entry.id}-out`,
            employee_id: entry.employee_id,
            employee_name: `${entry.employees?.first_name} ${entry.employees?.last_name}`,
            employee_number: entry.employees?.employee_number || 'N/A',
            action: 'clock_out',
            timestamp: entry.clock_out,
            method: entry.punch_out_method || 'unknown',
          });
        }
      });

      // Add break activities from detail_hub_breaks table
      breaksData?.forEach((breakRecord: any) => {
        if (breakRecord.break_start) {
          activities.push({
            id: `${breakRecord.id}-start`,
            employee_id: breakRecord.employee_id,
            employee_name: `${breakRecord.employees?.first_name} ${breakRecord.employees?.last_name}`,
            employee_number: breakRecord.employees?.employee_number || 'N/A',
            action: 'break_start',
            timestamp: breakRecord.break_start,
            method: 'manual',
          });
        }
        if (breakRecord.break_end) {
          activities.push({
            id: `${breakRecord.id}-end`,
            employee_id: breakRecord.employee_id,
            employee_name: `${breakRecord.employees?.first_name} ${breakRecord.employees?.last_name}`,
            employee_number: breakRecord.employees?.employee_number || 'N/A',
            action: 'break_end',
            timestamp: breakRecord.break_end,
            method: 'manual',
          });
        }
      });

      return activities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: open && !!kiosk?.id,
  });

  // Fetch unique employees who used this kiosk
  const { data: uniqueEmployees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['kiosk-employees', kiosk?.id],
    queryFn: async () => {
      if (!kiosk?.id) return [];

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .select(`
          employee_id,
          employees:detail_hub_employees(first_name, last_name, employee_number)
        `)
        .eq('kiosk_id', kiosk.kiosk_code);

      if (error) throw error;

      // Get unique employees
      const uniqueMap = new Map();
      data?.forEach((entry: any) => {
        if (!uniqueMap.has(entry.employee_id)) {
          uniqueMap.set(entry.employee_id, {
            id: entry.employee_id,
            name: `${entry.employees?.first_name} ${entry.employees?.last_name}`,
            employee_number: entry.employees?.employee_number,
          });
        }
      });

      return Array.from(uniqueMap.values());
    },
    enabled: open && !!kiosk?.id,
  });

  if (!kiosk) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'offline':
        return 'bg-gray-400';
      case 'warning':
        return 'bg-amber-500';
      case 'maintenance':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'clock_in':
        return '🟢';
      case 'clock_out':
        return '🔴';
      case 'break_start':
        return '⏸️';
      case 'break_end':
        return '▶️';
      default:
        return '⚪';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'clock_in':
        return 'Clocked In';
      case 'clock_out':
        return 'Clocked Out';
      case 'break_start':
        return 'Break Started';
      case 'break_end':
        return 'Break Ended';
      default:
        return action;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-gray-700" />
              <div>
                <DialogTitle className="text-2xl">{kiosk.name}</DialogTitle>
                <DialogDescription className="sr-only">
                  View detailed information, activity logs, and settings for {kiosk.name}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono">
                    {kiosk.kiosk_code}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(kiosk.status)} animate-pulse`} />
                    <span className="text-xs capitalize">{kiosk.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Location & Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location & Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{kiosk.location || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      variant={kiosk.status === 'online' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {kiosk.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Camera</p>
                    <Badge
                      variant={kiosk.camera_status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {kiosk.camera_status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Punches</p>
                    <p className="text-2xl font-bold">{kiosk.total_punches}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Punches Today</p>
                    <p className="text-xl font-semibold text-emerald-600">{kiosk.punches_today}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Network & Device Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Network & Device Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono">{kiosk.ip_address || 'Not detected'}</p>
                    {kiosk.ip_address && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {kiosk.ip_address.startsWith('192.') ||
                         kiosk.ip_address.startsWith('10.') ||
                         kiosk.ip_address.startsWith('172.')
                          ? 'Local'
                          : 'Public'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAC Address</p>
                  <p className="text-sm font-mono">{kiosk.mac_address || 'Not configured'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Ping</p>
                  <p className="text-sm">
                    {kiosk.last_ping
                      ? format(new Date(kiosk.last_ping), 'MMM dd, yyyy HH:mm:ss')
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Heartbeat</p>
                  <p className="text-sm">
                    {kiosk.last_heartbeat
                      ? format(new Date(kiosk.last_heartbeat), 'MMM dd, yyyy HH:mm:ss')
                      : 'Never'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Last Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Last Punch</p>
                    <p className="text-sm font-medium">
                      {kiosk.last_punch_at
                        ? format(new Date(kiosk.last_punch_at), 'MMM dd, yyyy HH:mm:ss')
                        : 'No punches yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {format(new Date(kiosk.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity ({recentActivity.length} events)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingActivity ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading activity...</p>
                ) : recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getActionIcon(activity.action)}</div>
                          <div>
                            <p className="text-sm font-medium">{activity.employee_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.employee_number} • {getActionLabel(activity.action)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(activity.timestamp), 'HH:mm:ss')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.timestamp), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Employees Who Used This Kiosk ({uniqueEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEmployees ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading employees...</p>
                ) : uniqueEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No employees have used this kiosk yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {uniqueEmployees.map((employee: any) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                          {employee.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.employee_number}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Kiosk Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Face Recognition */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium">Face Recognition</p>
                      <p className="text-xs text-muted-foreground">Enable facial recognition login</p>
                    </div>
                  </div>
                  {kiosk.face_recognition_enabled ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Manual Entry */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium">Manual Entry</p>
                      <p className="text-xs text-muted-foreground">Allow manual employee search</p>
                    </div>
                  </div>
                  {kiosk.allow_manual_entry ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Auto-Logout Timeout */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium">Auto-Logout Timeout</p>
                      <p className="text-xs text-muted-foreground">Session timeout duration</p>
                    </div>
                  </div>
                  <Badge variant="outline">{kiosk.sleep_timeout_minutes} seconds</Badge>
                </div>

                {/* Display Settings */}
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Display Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Brightness</p>
                      <p className="text-sm font-medium">{kiosk.screen_brightness}%</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="text-sm font-medium">{kiosk.volume}%</p>
                    </div>
                  </div>
                </div>

                {/* Theme */}
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Theme</p>
                  <p className="text-sm font-medium capitalize">{kiosk.theme || 'Default'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
