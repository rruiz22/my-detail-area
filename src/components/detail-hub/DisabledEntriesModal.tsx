/**
 * Disabled Entries Modal
 *
 * Management interface for viewing and permanently deleting disabled time entries.
 * Disabled entries are soft-deleted records that still exist in the database
 * and can cause overlap validation errors when creating new entries.
 *
 * Features:
 * - View all disabled entries with employee info
 * - Permanent deletion to prevent future conflicts
 * - Bulk delete all disabled entries
 * - Filter by date range
 *
 * Usage:
 * ```tsx
 * const [showDisabled, setShowDisabled] = useState(false);
 * <DisabledEntriesModal open={showDisabled} onClose={() => setShowDisabled(false)} />
 * ```
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Info,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

interface DisabledEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  notes: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface DisabledEntriesModalProps {
  open: boolean;
  onClose: () => void;
  onEntriesDeleted?: () => void;
}

export function DisabledEntriesModal({ open, onClose, onEntriesDeleted }: DisabledEntriesModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  const [entries, setEntries] = useState<DisabledEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch disabled entries
  useEffect(() => {
    if (open) {
      fetchDisabledEntries();
    }
  }, [open, selectedDealerId]);

  const fetchDisabledEntries = async () => {
    setIsLoading(true);
    try {
      const query = supabase
        .from('detail_hub_time_entries')
        .select(`
          id,
          employee_id,
          clock_in,
          clock_out,
          total_hours,
          notes,
          deleted_at,
          deleted_by,
          detail_hub_employees!inner(
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('status', 'disabled')
        .order('clock_in', { ascending: false });

      // Filter by dealership if not 'all'
      if (selectedDealerId !== 'all') {
        query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: DisabledEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        employee_id: entry.employee_id,
        employee_name: `${entry.detail_hub_employees.first_name} ${entry.detail_hub_employees.last_name}`,
        employee_number: entry.detail_hub_employees.employee_number,
        clock_in: entry.clock_in,
        clock_out: entry.clock_out,
        total_hours: entry.total_hours,
        notes: entry.notes,
        deleted_at: entry.deleted_at,
        deleted_by: entry.deleted_by
      }));

      setEntries(transformedData);
      console.log(`[DisabledEntries] Loaded ${transformedData.length} disabled entries`);
    } catch (error) {
      console.error('[DisabledEntries] Error fetching:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load disabled entries",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete single entry permanently
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Permanently delete this entry? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('detail_hub_time_entries')
        .delete()
        .eq('id', entryId)
        .eq('status', 'disabled'); // Safety: Only delete if disabled

      if (error) throw error;

      toast({
        title: "Entry Deleted",
        description: "Disabled entry permanently deleted",
        className: "bg-emerald-50 border-emerald-500"
      });

      // Remove from UI
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setSelectedIds(prev => {
        const updated = new Set(prev);
        updated.delete(entryId);
        return updated;
      });

      onEntriesDeleted?.();
    } catch (error) {
      console.error('[DisabledEntries] Delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all disabled entries (bulk)
  const handleDeleteAll = async () => {
    if (!confirm(`Permanently delete ALL ${entries.length} disabled entries? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('detail_hub_time_entries')
        .delete()
        .eq('status', 'disabled')
        .in('id', entries.map(e => e.id));

      if (error) throw error;

      toast({
        title: "All Entries Deleted",
        description: `${entries.length} disabled entries permanently deleted`,
        className: "bg-emerald-50 border-emerald-500"
      });

      setEntries([]);
      setSelectedIds(new Set());
      onEntriesDeleted?.();
    } catch (error) {
      console.error('[DisabledEntries] Bulk delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entries",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete selected entries
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Permanently delete ${selectedIds.size} selected entries? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('detail_hub_time_entries')
        .delete()
        .eq('status', 'disabled')
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Entries Deleted",
        description: `${selectedIds.size} disabled entries permanently deleted`,
        className: "bg-emerald-50 border-emerald-500"
      });

      setEntries(prev => prev.filter(e => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      onEntriesDeleted?.();
    } catch (error) {
      console.error('[DisabledEntries] Selected delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entries",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelection = (entryId: string) => {
    setSelectedIds(prev => {
      const updated = new Set(prev);
      if (updated.has(entryId)) {
        updated.delete(entryId);
      } else {
        updated.add(entryId);
      }
      return updated;
    });
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Disabled Time Entries Management
          </DialogTitle>
          <DialogDescription>
            View and permanently delete disabled time entries that may cause overlap errors.
            These entries are already inactive but still exist in the database.
          </DialogDescription>
        </DialogHeader>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>What are disabled entries?</strong> When you disable/delete a time entry,
            it's marked as "disabled" but not removed from the database. This can cause overlap
            errors when creating new entries for the same date. Permanently delete them here to
            prevent conflicts.
          </AlertDescription>
        </Alert>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading disabled entries...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Disabled Entries
            </h3>
            <p className="text-sm text-gray-600">
              All time entries are active or properly deleted. No conflicts detected.
            </p>
          </div>
        )}

        {/* Entries Table */}
        {!isLoading && entries.length > 0 && (
          <div className="space-y-4">
            {/* Stats and Actions Bar */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-semibold text-gray-900">{entries.length}</span>
                  <span className="text-gray-600"> disabled {entries.length === 1 ? 'entry' : 'entries'}</span>
                </div>
                {selectedIds.size > 0 && (
                  <div className="text-sm">
                    <span className="font-semibold text-emerald-600">{selectedIds.size}</span>
                    <span className="text-gray-600"> selected</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedIds.size === entries.length ? 'Deselect All' : 'Select All'}
                </Button>

                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Selected ({selectedIds.size})
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Delete All
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === entries.length && entries.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={selectedIds.has(entry.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelection(entry.id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {entry.employee_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.employee_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.clock_in), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(entry.clock_in), 'HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.clock_out
                          ? format(new Date(entry.clock_out), 'HH:mm')
                          : <Badge variant="outline" className="text-xs">In Progress</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {entry.total_hours
                          ? <span className="font-medium">{entry.total_hours.toFixed(2)}h</span>
                          : <span className="text-gray-400">N/A</span>
                        }
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {entry.notes ? (
                          <span className="text-xs text-gray-600 truncate block">
                            {entry.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No notes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {entry.deleted_at
                          ? format(new Date(entry.deleted_at), 'MMM d, HH:mm')
                          : <span className="text-gray-400">Unknown</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Warning Alert */}
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-sm text-red-900">
                <strong>Warning:</strong> Permanent deletion cannot be undone. These entries
                will be completely removed from the database and cannot be recovered.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
