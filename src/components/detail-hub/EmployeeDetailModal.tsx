/**
 * Employee Detail Modal
 *
 * Shows detailed information about a currently working employee
 * Includes time entry details, schedule info, and quick actions
 */

import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Clock,
  Coffee,
  MapPin,
  Calendar,
  Building2,
  User,
  LogOut,
  AlertCircle,
  CheckCircle,
  X,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import { CurrentlyWorkingEmployee, useElapsedTime } from "@/hooks/useCurrentlyWorking";
import { useClockOut, useStartBreak, useEndBreak } from "@/hooks/useDetailHubDatabase";
import { useToast } from "@/hooks/use-toast";
import { useBreakTimer } from "@/hooks/useBreakTimer";

interface EmployeeDetailModalProps {
  employee: CurrentlyWorkingEmployee;
  open: boolean;
  onClose: () => void;
}

export function EmployeeDetailModal({ employee, open, onClose }: EmployeeDetailModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const elapsedTime = useElapsedTime(employee.clock_in);

  const { mutateAsync: clockOut, isPending: clockingOut } = useClockOut();
  const { mutateAsync: startBreak, isPending: startingBreak } = useStartBreak();
  const { mutateAsync: endBreak, isPending: endingBreak } = useEndBreak();

  // Live break timer (updates every second)
  const breakTimer = useBreakTimer(employee.break_start, 30);

  const handleClockOut = async () => {
    try {
      await clockOut({
        employeeId: employee.employee_id,
        method: 'manual'
      });
      toast({
        title: t('detail_hub.toasts.clocked_out'),
        description: `${employee.employee_name} has been clocked out successfully`
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clock out",
        variant: "destructive"
      });
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreak({
        employeeId: employee.employee_id,
        method: 'manual'
      });
      toast({
        title: t('detail_hub.toasts.break_started'),
        description: "Break started successfully"
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start break",
        variant: "destructive"
      });
    }
  };

  const handleEndBreak = async () => {
    try {
      await endBreak({
        employeeId: employee.employee_id,
        method: 'manual'
      });
      toast({
        title: t('detail_hub.toasts.break_ended'),
        description: "Break ended successfully"
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end break",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" aria-describedby="employee-detail-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t('detail_hub.live_dashboard.view_details')}
          </DialogTitle>
        </DialogHeader>
        <p id="employee-detail-description" className="sr-only">
          Detailed view of {employee.employee_name}'s current work session
        </p>

        <div className="space-y-6">
          {/* Employee Header */}
          <Card className="card-enhanced">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-gray-200">
                  <AvatarImage src={employee.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-gray-100 text-gray-700 text-xl">
                    {employee.first_name[0]}{employee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {employee.employee_name}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{employee.employee_number}</Badge>
                    <Badge variant="secondary">{employee.department}</Badge>
                    <Badge variant="secondary">{employee.role}</Badge>
                    <Badge
                      className={
                        employee.is_on_break
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }
                    >
                      {employee.is_on_break ? (
                        <>
                          <Coffee className="w-3 h-3 mr-1" />
                          On Break
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                          Active
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Information Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Clock In Time with Photo Thumbnail */}
            <Card className="card-enhanced">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>Clocked In</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full text-left">
                      {/* Photo Thumbnail */}
                      {employee.photo_in_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-500 flex-shrink-0">
                          <img
                            src={employee.photo_in_url}
                            alt="Clock in photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                      )}

                      {/* Time */}
                      <div className="text-2xl font-bold text-gray-900">
                        {format(new Date(employee.clock_in), 'MMM d, HH:mm')}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96" align="start">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Clock In Verification Photo</h4>
                      {employee.photo_in_url ? (
                        <img
                          src={employee.photo_in_url}
                          alt="Clock in verification photo"
                          className="w-full rounded-lg border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No photo available</p>
                            <p className="text-xs text-gray-400 mt-1">Manual punch or legacy entry</p>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>📅 {format(new Date(employee.clock_in), 'MMMM d, yyyy')}</p>
                        <p>🕐 {format(new Date(employee.clock_in), 'HH:mm:ss')}</p>
                        <p>📍 {employee.kiosk_name || employee.kiosk_code || 'Default Kiosk'}</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Elapsed Time */}
            <Card className="card-enhanced">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>Elapsed Time</span>
                </div>
                <div className="text-2xl font-bold font-mono text-gray-900">
                  {elapsedTime}
                </div>
              </CardContent>
            </Card>

            {/* Break Status */}
            {employee.is_on_break && (
              <>
                <Card className="card-enhanced bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                      <Coffee className="w-4 h-4" />
                      <span>Break Started</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-700">
                      {format(new Date(employee.break_start!), 'HH:mm')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-enhanced bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                      <Coffee className="w-4 h-4" />
                      <span>Break Duration</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-700">
                      {employee.break_elapsed_minutes} min
                    </div>
                    {(employee.break_elapsed_minutes || 0) < 30 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {30 - (employee.break_elapsed_minutes || 0)} min until minimum
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Kiosk Location */}
            <Card className="card-enhanced">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Kiosk</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {employee.kiosk_name || employee.kiosk_code || 'Default Kiosk'}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Compliance */}
            {employee.schedule_variance_minutes !== null && (
              <Card className="card-enhanced">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>Schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Math.abs(employee.schedule_variance_minutes) <= 5 ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold">On Time</span>
                      </>
                    ) : employee.schedule_variance_minutes < 0 ? (
                      <>
                        <Clock className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-600">{Math.abs(employee.schedule_variance_minutes)} min early</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <span className="text-amber-600">{employee.schedule_variance_minutes} min late</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="card-enhanced">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 mb-4">Quick Actions</h4>

                <div className="grid grid-cols-2 gap-3">
                  {!employee.is_on_break && (
                    <Button
                      onClick={handleStartBreak}
                      disabled={startingBreak}
                      variant="outline"
                      className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    >
                      <Coffee className="w-4 h-4 mr-2" />
                      Start Break
                    </Button>
                  )}

                  {employee.is_on_break && (
                    <Button
                      onClick={handleEndBreak}
                      disabled={endingBreak || !breakTimer.isComplete}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                      title={!breakTimer.isComplete
                        ? `Break must be at least 30 minutes. ${breakTimer.formatted} remaining.`
                        : undefined
                      }
                    >
                      <Coffee className="w-4 h-4 mr-2" />
                      <span>End Break</span>
                      {!breakTimer.isComplete && (
                        <span className="ml-2 font-mono text-sm">
                          {breakTimer.formatted}
                        </span>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={handleClockOut}
                    disabled={clockingOut}
                    variant="destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Clock Out
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-2">
                  Note: Actions performed without photo verification
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
