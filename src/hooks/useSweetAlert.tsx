import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';

/**
 * @deprecated This hook is deprecated. Use ConfirmDialog component instead for Team Chat style modals.
 *
 * Migration guide:
 * - Replace useSweetAlert with ConfirmDialog component from '@/components/ui/confirm-dialog'
 * - See VehiclePhotosTab.tsx, ReconOrders.tsx, or ServiceOrders.tsx for examples
 *
 * Example:
 * ```tsx
 * <ConfirmDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   title="Delete Item?"
 *   description="This action cannot be undone."
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   onConfirm={handleConfirm}
 *   variant="destructive"
 * />
 * ```
 */
export function useSweetAlert() {
  const { t } = useTranslation();

  const confirmDelete = async (title?: string, text?: string) => {
    const result = await Swal.fire({
      title: title || t('sweetalert.confirm_delete'),
      text: text || t('sweetalert.delete_warning'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('sweetalert.yes_delete'),
      cancelButtonText: t('sweetalert.cancel'),
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-lg shadow-xl',
        title: 'text-xl font-bold text-gray-900',
        htmlContainer: 'text-sm text-gray-600',
        confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md mx-1',
        cancelButton: 'bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md mx-1',
        actions: 'gap-2'
      }
    });
    return result.isConfirmed;
  };

  const confirmStatusChange = async (status: string, title?: string) => {
    const result = await Swal.fire({
      title: title || t('sweetalert.confirm_status'),
      text: `Change status to "${status}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, change it!',
      cancelButtonText: t('sweetalert.cancel')
    });
    return result.isConfirmed;
  };

  const showSuccess = async (message: string, title?: string) => {
    return await Swal.fire({
      title: title || t('sweetalert.success'),
      text: message,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  };

  const showError = async (message: string, title?: string) => {
    return await Swal.fire({
      title: title || t('sweetalert.error'),
      text: message,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  };

  const showInfo = async (message: string, title?: string) => {
    return await Swal.fire({
      title: title || t('sweetalert.info'),
      text: message,
      icon: 'info',
      confirmButtonText: 'OK'
    });
  };

  return {
    confirmDelete,
    confirmStatusChange,
    showSuccess,
    showError,
    showInfo
  };
}