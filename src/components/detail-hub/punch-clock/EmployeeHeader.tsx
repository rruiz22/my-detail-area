/**
 * EmployeeHeader Component
 *
 * Displays employee information with optional status badge
 * Used in PIN auth and employee detail views
 *
 * Props:
 * - employee: DetailHubEmployee object
 * - compact?: boolean (smaller padding for PIN auth view)
 * - statusBadge?: { text: string, variant: 'success' | 'warning' | 'default' }
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { DetailHubEmployee } from "@/hooks/useDetailHubDatabase";

interface EmployeeHeaderProps {
  employee: DetailHubEmployee;
  compact?: boolean;
  statusBadge?: {
    text: string;
    variant: 'success' | 'warning' | 'default' | 'destructive';
  };
}

export function EmployeeHeader({ employee, compact = false, statusBadge }: EmployeeHeaderProps) {
  return (
    <Card className="card-enhanced">
      <CardContent className={compact ? "py-3" : "py-4"}>
        <div className="flex items-center gap-3">
          {/* Photo or Avatar */}
          <div className={compact ? "w-14 h-14" : "w-16 h-16"}>
            {employee.fallback_photo_url ? (
              <img
                src={employee.fallback_photo_url}
                alt={`${employee.first_name} ${employee.last_name}`}
                className="w-full h-full object-cover rounded-full border-2 border-gray-200"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <User className={compact ? "w-6 h-6" : "w-7 h-7"} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className={compact ? "text-lg font-bold text-gray-900" : "text-xl font-bold text-gray-900"}>
              {employee.first_name} {employee.last_name}
            </h2>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {employee.employee_number}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {employee.department}
              </Badge>
              {statusBadge && (
                <Badge
                  variant={statusBadge.variant}
                  className={
                    statusBadge.variant === 'success'
                      ? 'bg-emerald-500 text-white'
                      : statusBadge.variant === 'warning'
                      ? 'bg-amber-500 text-white'
                      : ''
                  }
                >
                  {statusBadge.text}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
