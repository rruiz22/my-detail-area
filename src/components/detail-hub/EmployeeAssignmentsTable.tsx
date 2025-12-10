/**
 * Employee Assignments Table
 *
 * Displays and manages employee-dealership assignments.
 * Shows which dealerships an employee is assigned to and their schedule templates.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Building2, Clock, AlertCircle } from "lucide-react";
import { useEmployeeAssignments, useDeleteAssignment, type EmployeeAssignment } from "@/hooks/useEmployeeAssignments";
import { useEmployeeById } from "@/hooks/useEmployeeById";
import { AssignmentModal } from "./AssignmentModal";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmployeeAssignmentsTableProps {
  /** Employee ID */
  employeeId: string;

  /** Employee name (for display in modals) */
  employeeName?: string;
}

/**
 * Table component for managing employee dealership assignments
 * Includes CRUD operations and schedule template display
 */
export function EmployeeAssignmentsTable({
  employeeId,
  employeeName
}: EmployeeAssignmentsTableProps) {
  const { t } = useTranslation();
  const { data: assignments, isLoading } = useEmployeeAssignments(employeeId);
  const { data: employee } = useEmployeeById(employeeId); // Fetch full employee data
  const { mutate: deleteAssignment } = useDeleteAssignment();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<EmployeeAssignment | null>(null);

  const handleDelete = () => {
    if (deletingAssignment) {
      deleteAssignment(deletingAssignment.id, {
        onSuccess: () => {
          setDeletingAssignment(null);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  const activeAssignments = assignments?.filter(a => a.status === 'active') || [];
  const inactiveAssignments = assignments?.filter(a => a.status !== 'active') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('detail_hub.assignments.title')}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {t('detail_hub.assignments.subtitle')}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('detail_hub.assignments.assign_button')}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {activeAssignments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('detail_hub.assignments.no_active_assignments')}.</strong> {t('detail_hub.assignments.no_assignments_description')}
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail_hub.assignments.table.dealership')}</TableHead>
                  <TableHead>{t('detail_hub.assignments.table.shift_hours')}</TableHead>
                  <TableHead>{t('detail_hub.assignments.table.punch_window')}</TableHead>
                  <TableHead>{t('detail_hub.assignments.table.break')}</TableHead>
                  <TableHead>{t('detail_hub.assignments.table.status')}</TableHead>
                  <TableHead className="text-right">{t('detail_hub.assignments.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {assignment.dealership.logo_url && (
                          <img
                            src={assignment.dealership.logo_url}
                            alt=""
                            className="h-6 w-6 object-contain"
                          />
                        )}
                        <span className="font-medium">{assignment.dealership.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {assignment.schedule_template.shift_start_time || 'N/A'} -{' '}
                        {assignment.schedule_template.shift_end_time || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {assignment.schedule_template.early_punch_allowed_minutes != null
                          ? `-${assignment.schedule_template.early_punch_allowed_minutes}m`
                          : t('detail_hub.assignments.table.no_limit')} / {assignment.schedule_template.late_punch_grace_minutes != null
                          ? `+${assignment.schedule_template.late_punch_grace_minutes}m`
                          : t('detail_hub.assignments.table.no_limit')}
                      </div>
                      <div className="text-xs text-gray-500">{t('detail_hub.assignments.table.early_late_label')}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {assignment.schedule_template.required_break_minutes ?? 0} {t('detail_hub.assignments.table.break_minutes')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {assignment.schedule_template.break_is_paid ? t('detail_hub.assignments.table.paid') : t('detail_hub.assignments.table.unpaid')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={assignment.status === 'active' ? 'default' : 'secondary'}
                        className={assignment.status === 'active' ? 'bg-green-600' : ''}
                      >
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAssignment(assignment)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingAssignment(assignment)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Inactive Assignments */}
          {inactiveAssignments.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{t('detail_hub.assignments.inactive_assignments')}</h4>
              <div className="space-y-2">
                {inactiveAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {assignment.dealership.logo_url && (
                        <img
                          src={assignment.dealership.logo_url}
                          alt=""
                          className="h-5 w-5 object-contain opacity-50"
                        />
                      )}
                      <span className="text-sm text-gray-600">{assignment.dealership.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {assignment.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAssignment(assignment)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Assignment Modal */}
      <AssignmentModal
        assignment={null}
        employeeId={employeeId}
        employeeName={employeeName}
        employeeScheduleTemplate={employee?.schedule_template}
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Assignment Modal */}
      <AssignmentModal
        assignment={editingAssignment}
        employeeId={employeeId}
        employeeName={employeeName}
        employeeScheduleTemplate={employee?.schedule_template}
        open={!!editingAssignment}
        onClose={() => setEditingAssignment(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAssignment} onOpenChange={() => setDeletingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail_hub.assignments.remove_assignment')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail_hub.assignments.remove_confirmation', {
                employeeName,
                dealership: deletingAssignment?.dealership.name
              })}
              <br />
              <br />
              <strong>{t('detail_hub.assignments.note_existing_entries')}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('detail_hub.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('detail_hub.assignments.remove_button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
