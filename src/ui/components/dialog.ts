/**
 * Fontify - Material 3 Expressive Confirmation Dialog
 */

export type DialogIconType = 'apply' | 'reboot' | 'revert' | 'info' | 'error';

export interface DialogOptions {
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  iconType?: DialogIconType;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DIALOG_ICONS: Record<DialogIconType, string> = {
  apply: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
  reboot: '<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>',
  revert: '<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>',
  info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
  error: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>'
};

export function showConfirmDialog(options: DialogOptions): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn') as HTMLButtonElement | null;
    const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLButtonElement | null;
    const iconSvg = document.getElementById('dialog-icon-svg');

    if (!modalOverlay || !modalTitle || !modalBody || !modalConfirmBtn || !modalCancelBtn) {
      // Fallback if DOM elements are missing
      const result = window.confirm(`${options.title}\n\n${options.body.replace(/<[^>]*>/g, '')}`);
      if (result) {
        options.onConfirm?.();
        resolve(true);
      } else {
        options.onCancel?.();
        resolve(false);
      }
      return;
    }

    modalTitle.textContent = options.title;
    modalBody.innerHTML = options.body;
    modalConfirmBtn.textContent = options.confirmText ?? 'Confirm';
    modalCancelBtn.textContent = options.cancelText ?? 'Cancel';

    if (iconSvg && options.iconType && DIALOG_ICONS[options.iconType]) {
      iconSvg.innerHTML = DIALOG_ICONS[options.iconType];
    }

    modalOverlay.classList.add('open');

    const handleConfirm = () => {
      cleanup();
      modalOverlay.classList.remove('open');
      options.onConfirm?.();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      modalOverlay.classList.remove('open');
      options.onCancel?.();
      resolve(false);
    };

    const cleanup = () => {
      modalConfirmBtn.removeEventListener('click', handleConfirm);
      modalCancelBtn.removeEventListener('click', handleCancel);
    };

    modalConfirmBtn.addEventListener('click', handleConfirm);
    modalCancelBtn.addEventListener('click', handleCancel);
  });
}
