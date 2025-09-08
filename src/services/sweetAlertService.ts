import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export interface SweetAlertOptions {
  title?: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}

class SweetAlertService {
  private getThemeStyles() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      background: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
      color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
      confirmButtonColor: 'hsl(var(--primary))',
      cancelButtonColor: 'hsl(var(--destructive))',
    };
  }

  async show(options: SweetAlertOptions) {
    const styles = this.getThemeStyles();
    
    return await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon,
      showCancelButton: options.showCancelButton ?? false,
      confirmButtonText: options.confirmButtonText || 'OK',
      cancelButtonText: options.cancelButtonText || 'Cancel',
      background: styles.background,
      color: styles.color,
      confirmButtonColor: styles.confirmButtonColor,
      cancelButtonColor: styles.cancelButtonColor,
      customClass: {
        popup: 'font-sans',
        title: 'text-lg font-semibold',
        htmlContainer: 'text-sm text-muted-foreground',
        confirmButton: 'px-4 py-2 rounded-md font-medium',
        cancelButton: 'px-4 py-2 rounded-md font-medium',
      },
      buttonsStyling: false,
    });
  }

  async confirmDelete(title?: string, text?: string) {
    return this.show({
      title: title || 'Are you sure?',
      text: text || 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
  }

  async confirmStatusChange(status: string, title?: string) {
    return this.show({
      title: title || 'Confirm Status Change',
      text: `This will change the order status to "${status}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, change it!',
      cancelButtonText: 'Cancel'
    });
  }

  async showSuccess(title?: string, text?: string) {
    return this.show({
      title: title || 'Success!',
      text: text,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  async showError(title?: string, text?: string) {
    return this.show({
      title: title || 'Error!',
      text: text,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }

  async showInfo(title?: string, text?: string) {
    return this.show({
      title: title || 'Information',
      text: text,
      icon: 'info',
      confirmButtonText: 'OK'
    });
  }
}

export const sweetAlert = new SweetAlertService();