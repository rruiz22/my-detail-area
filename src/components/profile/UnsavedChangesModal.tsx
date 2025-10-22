import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

/**
 * UnsavedChangesModal Component
 *
 * Enterprise-grade confirmation dialog for unsaved changes
 * Provides three options:
 * 1. Cancel - Stay on page and continue editing
 * 2. Discard - Leave page without saving
 * 3. Save - Save changes and continue
 *
 * @example
 * ```tsx
 * <UnsavedChangesModal
 *   open={showModal}
 *   onOpenChange={setShowModal}
 *   onDiscard={() => {
 *     resetForm();
 *     navigate('/somewhere');
 *   }}
 *   onSave={async () => {
 *     await saveChanges();
 *     navigate('/somewhere');
 *   }}
 * />
 * ```
 */
export function UnsavedChangesModal({
  open,
  onOpenChange,
  onDiscard,
  onSave,
  isSaving = false,
}: UnsavedChangesModalProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              {t('profile.unsaved_changes_title', 'Unsaved Changes')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {t(
              'profile.unsaved_changes_description',
              'You have unsaved changes that will be lost if you leave this page. What would you like to do?'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="sm:order-1">
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            variant="outline"
            className="sm:order-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {t('profile.discard_changes', 'Discard Changes')}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSave}
            disabled={isSaving}
            className="sm:order-3"
          >
            {isSaving
              ? t('common.saving', 'Saving...')
              : t('profile.save_and_continue', 'Save & Continue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to manage unsaved changes state
 * Provides utilities for tracking dirty state and preventing navigation
 *
 * @example
 * ```tsx
 * const {
 *   isDirty,
 *   setIsDirty,
 *   showModal,
 *   setShowModal,
 *   handleNavigate
 * } = useUnsavedChanges();
 *
 * // Mark form as dirty when user edits
 * const handleInputChange = (field, value) => {
 *   setFormData({ ...formData, [field]: value });
 *   setIsDirty(true);
 * };
 *
 * // Use handleNavigate before leaving page
 * const goToSettings = () => {
 *   handleNavigate(() => navigate('/settings'));
 * };
 * ```
 */
export function useUnsavedChanges() {
  const [isDirty, setIsDirty] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | null>(null);

  const handleNavigate = React.useCallback(
    (navigationFn: () => void) => {
      if (isDirty) {
        setPendingNavigation(() => navigationFn);
        setShowModal(true);
      } else {
        navigationFn();
      }
    },
    [isDirty]
  );

  const handleDiscard = React.useCallback(() => {
    setIsDirty(false);
    setShowModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const handleSave = React.useCallback(
    async (saveFn: () => Promise<void>) => {
      try {
        await saveFn();
        setIsDirty(false);
        setShowModal(false);
        if (pendingNavigation) {
          pendingNavigation();
          setPendingNavigation(null);
        }
      } catch (error) {
        console.error('Error saving:', error);
        // Keep modal open if save fails
      }
    },
    [pendingNavigation]
  );

  return {
    isDirty,
    setIsDirty,
    showModal,
    setShowModal,
    handleNavigate,
    handleDiscard,
    handleSave,
  };
}

// React import at top
import React from 'react';
