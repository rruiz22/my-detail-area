import { useTranslation } from 'react-i18next';
import { sweetAlert } from '@/services/sweetAlertService';

export function useSweetAlert() {
  const { t } = useTranslation();

  const confirmDelete = async (title?: string, text?: string) => {
    const result = await sweetAlert.confirmDelete(
      title || t('sweetalert.confirm_delete'),
      text || t('sweetalert.delete_warning')
    );
    return result.isConfirmed;
  };

  const confirmStatusChange = async (status: string, title?: string) => {
    const result = await sweetAlert.confirmStatusChange(
      status,
      title || t('sweetalert.confirm_status')
    );
    return result.isConfirmed;
  };

  const showSuccess = async (message: string, title?: string) => {
    return await sweetAlert.showSuccess(
      title || t('sweetalert.success'),
      message
    );
  };

  const showError = async (message: string, title?: string) => {
    return await sweetAlert.showError(
      title || t('sweetalert.error'),
      message
    );
  };

  const showInfo = async (message: string, title?: string) => {
    return await sweetAlert.showInfo(
      title || t('sweetalert.info'),
      message
    );
  };

  return {
    confirmDelete,
    confirmStatusChange,
    showSuccess,
    showError,
    showInfo
  };
}