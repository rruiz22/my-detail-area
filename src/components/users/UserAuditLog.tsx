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
    const email = event.affected_user_email || t('users.audit.metadata.unknown_email');
    const role = event.metadata?.role || t('users.audit.metadata.unknown_role');

    switch (event.event_type) {
      case 'user_created':
        return t('users.audit.descriptions.user_created', { email });
      case 'user_updated':
        return t('users.audit.descriptions.user_updated', { email });
      case 'user_deleted':
        return t('users.audit.descriptions.user_deleted', { email });
      case 'role_assigned':
        return t('users.audit.descriptions.role_assigned', { role, email });
      case 'invitation_sent':
        return t('users.audit.descriptions.invitation_sent', { email: event.metadata?.email || email });
      default:
        return t('users.audit.descriptions.default_event', { eventType: event.event_type });
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
            {t('users.audit.title')}
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => exportAuditLog(filters)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('users.audit.export_log')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">{t('users.audit.filters.title')}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('users.audit.filters.search_placeholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('users.audit.filters.event_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.audit.event_types.all_events')}</SelectItem>
                <SelectItem value="user_created">{t('users.audit.event_types.user_created')}</SelectItem>
                <SelectItem value="user_updated">{t('users.audit.event_types.user_updated')}</SelectItem>
                <SelectItem value="user_deleted">{t('users.audit.event_types.user_deleted')}</SelectItem>
                <SelectItem value="role_assigned">{t('users.audit.event_types.role_assigned')}</SelectItem>
                <SelectItem value="invitation_sent">{t('users.audit.event_types.invitation_sent')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('users.audit.filters.entity_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.audit.entity_types.all_entities')}</SelectItem>
                <SelectItem value="user">{t('users.audit.entity_types.user')}</SelectItem>
                <SelectItem value="invitation">{t('users.audit.entity_types.invitation')}</SelectItem>
                <SelectItem value="membership">{t('users.audit.entity_types.membership')}</SelectItem>
                <SelectItem value="role">{t('users.audit.entity_types.role')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder={t('users.audit.filters.from_date')}
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder={t('users.audit.filters.to_date')}
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={clearFilters} size="sm">
              {t('users.audit.filters.clear_filters')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {auditEvents.length} {t('users.audit.messages.events_found')}
            </span>
          </div>
        </div>

        <Separator />

        {/* Audit Events */}
        <div className="space-y-4">
          {auditEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('users.audit.messages.no_events_found')}</p>
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
                    <span>{event.user_email ? t('users.audit.metadata.by_user', { user: event.user_email }) : t('users.audit.metadata.by_system')}</span>
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
                        {t('users.audit.messages.view_details')}
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