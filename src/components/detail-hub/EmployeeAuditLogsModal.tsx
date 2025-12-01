import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Clock,
  UserPlus,
  Edit,
  XCircle,
  UserCheck,
  Shield,
  Camera,
  Briefcase,
  FileText,
  UserX,
  DollarSign
} from "lucide-react";
import { useEmployeeAuditLogs, EmployeeAuditLog } from "@/hooks/useDetailHubDatabase";
import { format } from "date-fns";

interface EmployeeAuditLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  employeeName: string;
}

export function EmployeeAuditLogsModal({
  open,
  onOpenChange,
  employeeId,
  employeeName
}: EmployeeAuditLogsModalProps) {
  const { t } = useTranslation();
  const { data: auditLogs = [], isLoading } = useEmployeeAuditLogs(employeeId);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <UserPlus className="w-5 h-5 text-green-600" />;
      case 'updated':
        return <Edit className="w-5 h-5 text-blue-600" />;
      case 'deleted':
        return <UserX className="w-5 h-5 text-red-600" />;
      case 'status_changed':
        return <CheckCircle2 className="w-5 h-5 text-amber-600" />;
      case 'role_changed':
        return <Briefcase className="w-5 h-5 text-indigo-600" />;
      case 'pin_reset':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'face_enrolled':
        return <Camera className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionLabel = (log: EmployeeAuditLog) => {
    switch (log.action_type) {
      case 'created':
        return t('detail_hub.employees.logs.created');
      case 'updated':
        return t('detail_hub.employees.logs.updated');
      case 'deleted':
        return t('detail_hub.employees.logs.deleted');
      case 'status_changed':
        return t('detail_hub.employees.logs.status_changed');
      case 'role_changed':
        return t('detail_hub.employees.logs.role_changed');
      case 'pin_reset':
        return t('detail_hub.employees.logs.pin_reset');
      case 'face_enrolled':
        return t('detail_hub.employees.logs.face_enrolled');
      default:
        return t('detail_hub.employees.logs.updated');
    }
  };

  const formatFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      'first_name': t('common.first_name'),
      'last_name': t('common.last_name'),
      'email': t('common.email'),
      'phone': t('common.phone'),
      'role': t('detail_hub.employees.role'),
      'department': t('detail_hub.employees.department'),
      'hourly_rate': t('detail_hub.employees.hourly_rate'),
      'hire_date': t('detail_hub.employees.hire_date'),
      'status': t('detail_hub.employees.status'),
      'pin_code': t('detail_hub.employees.kiosk_pin'),
      'employee_number': t('detail_hub.employees.employee_number')
    };
    return labels[field] || field;
  };

  const formatValue = (value: string | null, field?: string) => {
    if (!value) return t('common.not_set');

    // Format based on field type
    if (field === 'hourly_rate') {
      // 🔒 PRIVACY: Hide hourly rate in audit logs
      return '••••••';
    }

    if (field === 'hire_date') {
      try {
        return format(new Date(value), 'MMM d, yyyy');
      } catch {
        return value;
      }
    }

    if (field === 'status') {
      const statusLabels: Record<string, string> = {
        'active': t('detail_hub.employees.active'),
        'inactive': t('detail_hub.employees.inactive'),
        'suspended': t('detail_hub.employees.suspended'),
        'terminated': t('detail_hub.employees.terminated')
      };
      return statusLabels[value] || value;
    }

    if (field === 'role') {
      const roleLabels: Record<string, string> = {
        'detailer': t('detail_hub.employees.roles.detailer'),
        'car_wash': t('detail_hub.employees.roles.car_wash'),
        'supervisor': t('detail_hub.employees.roles.supervisor'),
        'manager': t('detail_hub.employees.roles.manager'),
        'technician': t('detail_hub.employees.roles.technician')
      };
      return roleLabels[value] || value;
    }

    if (field === 'department') {
      const deptLabels: Record<string, string> = {
        'detail': t('detail_hub.employees.departments.detail'),
        'car_wash': t('detail_hub.employees.departments.car_wash'),
        'service': t('detail_hub.employees.departments.service'),
        'management': t('detail_hub.employees.departments.management')
      };
      return deptLabels[value] || value;
    }

    if (field === 'pin_code') {
      return '••••••'; // Hide PIN for security
    }

    return value;
  };

  const getChangeDetails = (log: EmployeeAuditLog) => {
    // Multiple field changes
    if (log.metadata?.changes) {
      const changes = log.metadata.changes as Array<{field: string; old: string; new: string}>;
      return (
        <div className="mt-2 space-y-2">
          {changes.filter(c => c !== null).map((change, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium text-gray-700 min-w-[120px]">
                {formatFieldLabel(change.field)}:
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 line-through">
                  {formatValue(change.old, change.field)}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 font-medium">
                  {formatValue(change.new, change.field)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Single field change
    if (log.field_name && log.old_value !== null && log.new_value !== null) {
      return (
        <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
          <span className="font-medium text-gray-700 min-w-[120px]">
            {formatFieldLabel(log.field_name)}:
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 line-through">
              {formatValue(log.old_value, log.field_name)}
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 font-medium">
              {formatValue(log.new_value, log.field_name)}
            </span>
          </div>
        </div>
      );
    }

    // Creation with initial values
    if (log.action_type === 'created' && log.new_value) {
      try {
        const data = JSON.parse(log.new_value);
        return (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
            {data.employee_number && (
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-green-600" />
                <span className="text-green-800">
                  Employee #: <strong>{data.employee_number}</strong>
                </span>
              </div>
            )}
            {data.role && (
              <div className="text-green-700">
                Role: <strong>{formatValue(data.role, 'role')}</strong>
              </div>
            )}
            {data.department && (
              <div className="text-green-700">
                Department: <strong>{formatValue(data.department, 'department')}</strong>
              </div>
            )}
            {data.hourly_rate && (
              <div className="flex items-center gap-1 text-green-700">
                <DollarSign className="w-3 h-3" />
                <span className="font-mono">••••••</span>/hr
              </div>
            )}
          </div>
        );
      } catch {
        return null;
      }
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('detail_hub.employees.logs.title')}</DialogTitle>
          <DialogDescription>
            {employeeName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{t('detail_hub.employees.logs.no_logs')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="relative">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow">
                      {getActionIcon(log.action_type)}
                    </div>
                    {index < auditLogs.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" style={{height: '100%'}}></div>
                    )}
                  </div>

                  {/* Event details */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-medium">{getActionLabel(log)}</p>
                        {log.user && (
                          <p className="text-sm text-muted-foreground">
                            {t('detail_hub.employees.logs.by')} {log.user.first_name} {log.user.last_name}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </Badge>
                    </div>

                    {/* Change details */}
                    {getChangeDetails(log)}

                    {/* IP Address if available */}
                    {log.ip_address && (
                      <div className="text-xs text-muted-foreground mt-2">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
