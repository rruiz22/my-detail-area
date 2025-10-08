import Swal from 'sweetalert2';

/**
 * Custom SweetAlert2 configuration following Notion design system
 * - Flat colors (no gradients)
 * - Muted palette (gray-based with subtle accents)
 * - Clean typography
 * - Consistent with design system
 */

const notionStyles = {
  popup: 'rounded-lg shadow-lg border border-gray-200',
  title: 'text-gray-900 font-semibold text-lg',
  htmlContainer: 'text-gray-600 text-sm',
  confirmButton: 'bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-md transition-colors',
  cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors',
  denyButton: 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition-colors',
};

export const NotionSwal = Swal.mixin({
  customClass: notionStyles,
  buttonsStyling: false, // Disable default styles to use custom classes
  showClass: {
    popup: 'animate-in fade-in-0 zoom-in-95',
  },
  hideClass: {
    popup: 'animate-out fade-out-0 zoom-out-95',
  },
});

/**
 * Show confirmation dialog with Notion design
 */
export const confirmDelete = async (title: string, text: string, confirmText: string, cancelText: string) => {
  return await NotionSwal.fire({
    title,
    text,
    icon: 'warning',
    iconColor: '#f59e0b', // amber-500 (muted warning)
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    customClass: {
      ...notionStyles,
      confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition-colors',
      cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors',
    }
  });
};

/**
 * Show error dialog with Notion design
 */
export const showError = async (title: string, text: string, confirmText: string = 'OK') => {
  return await NotionSwal.fire({
    title,
    text,
    icon: 'error',
    iconColor: '#ef4444', // red-500 (muted error)
    confirmButtonText: confirmText,
  });
};

/**
 * Show success dialog with Notion design
 */
export const showSuccess = async (title: string, text: string, timer: number = 2000) => {
  return await NotionSwal.fire({
    title,
    text,
    icon: 'success',
    iconColor: '#10b981', // emerald-500 (muted success)
    confirmButtonText: 'OK',
    timer,
    timerProgressBar: true,
  });
};

/**
 * Show info dialog with Notion design
 */
export const showInfo = async (title: string, text: string, confirmText: string = 'OK') => {
  return await NotionSwal.fire({
    title,
    text,
    icon: 'info',
    iconColor: '#6366f1', // indigo-500 (muted info)
    confirmButtonText: confirmText,
  });
};
