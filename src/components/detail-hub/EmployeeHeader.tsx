/**
 * EmployeeHeader Component
 *
 * Displays employee information with photo, name, badges (employee number, department, role)
 * and optional status badge. Supports compact mode for smaller displays.
 *
 * Part of the intelligent kiosk system.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import type { DetailHubEmployee } from "@/hooks/useDetailHubDatabase";

interface EmployeeHeaderProps {
  employee: DetailHubEmployee;
  statusBadge?: {
    text: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  };
  compact?: boolean;
}

export function EmployeeHeader({ employee, statusBadge, compact = false }: EmployeeHeaderProps) {
  return (
    <Card className="card-enhanced">
      <CardContent className={compact ? "py-4" : "py-6"}>
        <div className="flex items-center gap-4">
          {/* Photo or Avatar */}
          <div className={`${compact ? 'w-12 h-12' : 'w-20 h-20'} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0`}>
            {employee.fallback_photo_url ? (
              <img
                src={employee.fallback_photo_url}
                alt={`${employee.first_name} ${employee.last_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} text-gray-400`} />
            )}
          </div>

          {/* Employee Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}>
                {employee.first_name} {employee.last_name}
              </h3>
              {statusBadge && (
                <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{employee.employee_number}</Badge>
              <Badge variant="secondary">{employee.department}</Badge>
              <Badge variant="secondary">{employee.role}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
