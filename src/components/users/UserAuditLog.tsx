import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useUserAudit, AuditEvent } from '@/hooks/useUserAudit';
import { 
  Shield, 
  User, 
  Mail, 
  Download, 
  Filter, 
  Calendar,
  Activity,
  Search,
  Clock,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface UserAuditLogProps {
  dealerId?: number;
}

export const UserAuditLog: React.FC<UserAuditLogProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { auditEvents, loading, fetchAuditEvents, exportAuditLog } = useUserAudit(dealerId);
  
  const [filters, setFilters] = useState({
    eventType: '',
    entityType: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    const normalizedValue = value === 'all' ? '' : value;
    const newFilters = { ...filters, [key]: normalizedValue };
    setFilters(newFilters);
    fetchAuditEvents(newFilters);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'user_created':
      case 'user_updated':
      case 'user_deleted':
        return <User className="h-4 w-4" />;
      case 'role_assigned':
        return <Shield className="h-4 w-4" />;
      case 'invitation_sent':
        return <Mail className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'user_created':
        return 'bg-green-500';
      case 'user_updated':
        return 'bg-blue-500';
      case 'user_deleted':
        return 'bg-red-500';
      case 'role_assigned':
        return 'bg-purple-500';
      case 'invitation_sent':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatEventDescription = (event: AuditEvent) => {
    switch (event.event_type) {
      case 'user_created':
        return `User ${event.affected_user_email || 'Unknown'} was created`;
      case 'user_updated':
        return `User ${event.affected_user_email || 'Unknown'} was updated`;
      case 'user_deleted':
        return `User ${event.affected_user_email || 'Unknown'} was deleted`;
      case 'role_assigned':
        return `Role ${event.metadata?.role || 'Unknown'} was assigned to ${event.affected_user_email || 'Unknown'}`;
      case 'invitation_sent':
        return `Invitation sent to ${event.metadata?.email || 'Unknown'}`;
      default:
        return `${event.event_type} occurred`;
    }
  };

  const clearFilters = () => {
    const emptyFilters = {
      eventType: '',
      entityType: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    };
    setFilters(emptyFilters);
    fetchAuditEvents(emptyFilters);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            User Activity Audit Log
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => exportAuditLog(filters)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="user_updated">User Updated</SelectItem>
                <SelectItem value="user_deleted">User Deleted</SelectItem>
                <SelectItem value="role_assigned">Role Assigned</SelectItem>
                <SelectItem value="invitation_sent">Invitation Sent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="invitation">Invitation</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="From Date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="To Date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear Filters
            </Button>
            <span className="text-sm text-muted-foreground">
              {auditEvents.length} events found
            </span>
          </div>
        </div>

        <Separator />

        {/* Audit Events */}
        <div className="space-y-4">
          {auditEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit events found</p>
            </div>
          ) : (
            auditEvents.map((event) => (
              <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                  {getEventIcon(event.event_type)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{formatEventDescription(event)}</h4>
                      <Badge variant="outline" className="text-xs">
                        {event.event_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>By: {event.user_email || 'System'}</span>
                    {event.ip_address && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{event.ip_address}</span>
                      </div>
                    )}
                  </div>
                  
                  {Object.keys(event.metadata).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};