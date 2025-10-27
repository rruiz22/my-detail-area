import { useState, useCallback } from 'react';

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

/**
 * useConfirmDialog - Hook for managing confirmation dialogs
 * Replaces useSweetAlert throughout the application
 *
 * Usage:
 * ```tsx
 * const confirm = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm.show({
 *     title: 'Delete Photo?',
 *     description: 'This action cannot be undone.',
 *     variant: 'destructive'
 *   });
 *
 *   if (confirmed) {
 *     // perform delete
 *   }
 * };
 * ```
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState & { resolver?: (value: boolean) => void }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const show = useCallback(
    (options: Omit<ConfirmDialogState, 'onConfirm' | 'open'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title: options.title,
          description: options.description,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          variant: options.variant,
          onConfirm: () => {
            resolve(true);
            setState((prev) => ({ ...prev, open: false }));
          },
          resolver: resolve,
        });
      });
    },
    []
  );

  const hide = useCallback(() => {
    if (state.resolver) {
      state.resolver(false);
    }
    setState((prev) => ({ ...prev, open: false }));
  }, [state.resolver]);

  return {
    state: {
      open: state.open,
      title: state.title,
      description: state.description,
      confirmText: state.confirmText,
      cancelText: state.cancelText,
      variant: state.variant,
      onConfirm: state.onConfirm,
    },
    show,
    hide,
  };
}
