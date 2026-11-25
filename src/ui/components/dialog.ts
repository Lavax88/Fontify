/**
 * Fontify - Material 3 Expressive Dialog Controller (<m3e-dialog>)
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

export interface ApplyWorkflowOptions {
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  iconType?: DialogIconType;
  onApply: (onProgress: (percent: number, message: string) => void) => Promise<void>;
  onReboot: () => Promise<void> | void;
  onCancelReboot?: () => void;
}

type M3eDialogLike = HTMLElement & {
  open: boolean;
  disableClose?: boolean;
  show: () => Promise<void> | void;
  hide: (returnValue?: string) => Promise<void> | void;
};

type M3eProgressLike = HTMLElement & {
  value: number;
  indeterminate?: boolean;
};

const ICON_NAMES: Record<DialogIconType, string> = {
  apply: 'check_circle',
  reboot: 'refresh',
  revert: 'restart_alt',
  info: 'info',
  error: 'error'
};

function setDialogIcon(iconEl: HTMLElement | null, type?: DialogIconType): void {
  if (iconEl && type && ICON_NAMES[type]) {
    iconEl.setAttribute('name', ICON_NAMES[type]);
  }
}

export function showConfirmDialog(options: DialogOptions): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const dialog = document.getElementById('app-dialog') as M3eDialogLike | null;
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn') as HTMLElement | null;
    const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLElement | null;
    const dialogIcon = document.getElementById('dialog-icon');
    const progressStage = document.getElementById('dialog-progress-stage');
    const countdownStage = document.getElementById('dialog-countdown-stage');
    const dialogActions = document.getElementById('dialog-actions');

    if (!dialog || !modalTitle || !modalBody || !modalConfirmBtn || !modalCancelBtn) {
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

    modalBody.style.display = 'block';
    if (progressStage) progressStage.style.display = 'none';
    if (countdownStage) countdownStage.style.display = 'none';
    if (dialogActions) dialogActions.style.display = 'flex';
    modalCancelBtn.style.display = 'inline-flex';
    modalConfirmBtn.style.display = 'inline-flex';

    modalTitle.textContent = options.title;
    modalBody.innerHTML = options.body;
    modalConfirmBtn.textContent = options.confirmText ?? 'Confirm';
    modalCancelBtn.textContent = options.cancelText ?? 'Cancel';
    setDialogIcon(dialogIcon, options.iconType ?? 'info');

    dialog.disableClose = false;
    dialog.removeAttribute('disable-close');
    dialog.show();

    let settled = false;
    const cleanup = () => {
      modalConfirmBtn.removeEventListener('click', handleConfirm);
      modalCancelBtn.removeEventListener('click', handleCancel);
      dialog.removeEventListener('cancel', handleCancel);
    };

    const handleConfirm = () => {
      if (settled) return;
      settled = true;
      cleanup();
      dialog.hide('confirm');
      options.onConfirm?.();
      resolve(true);
    };

    const handleCancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
      dialog.hide('cancel');
      options.onCancel?.();
      resolve(false);
    };

    modalConfirmBtn.addEventListener('click', handleConfirm);
    modalCancelBtn.addEventListener('click', handleCancel);
    dialog.addEventListener('cancel', handleCancel);
  });
}

/**
 * Runs the complete apply lifecycle inside <m3e-dialog>:
 * 1. Prompts confirmation
 * 2. Morphs dialog into wavy circular progress indicator
 * 3. Morphs into 5-second auto-reboot countdown with manual override
 */
export async function runApplyWorkflow(options: ApplyWorkflowOptions): Promise<boolean> {
  const dialog = document.getElementById('app-dialog') as M3eDialogLike | null;
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn') as HTMLElement | null;
  const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLElement | null;
  const dialogIcon = document.getElementById('dialog-icon');
  const progressStage = document.getElementById('dialog-progress-stage');
  const progressBar = document.getElementById('dialog-progress-bar') as M3eProgressLike | null;
  const progressPct = document.getElementById('dialog-progress-pct');
  const progressMsg = document.getElementById('dialog-progress-msg');
  const countdownStage = document.getElementById('dialog-countdown-stage');
  const countdownBar = document.getElementById('dialog-countdown-bar') as M3eProgressLike | null;
  const countdownSec = document.getElementById('dialog-countdown-sec');
  const countdownMsg = document.getElementById('dialog-countdown-msg');
  const dialogActions = document.getElementById('dialog-actions');

  if (!dialog || !modalTitle || !modalBody || !modalConfirmBtn || !modalCancelBtn) {
    const ok = window.confirm(`${options.title}\n\n${options.body.replace(/<[^>]*>/g, '')}`);
    if (!ok) return false;
    await options.onApply(() => {});
    await options.onReboot();
    return true;
  }

  // Stage 1: Confirmation Prompt
  const confirmed = await new Promise<boolean>(resolve => {
    modalBody.style.display = 'block';
    if (progressStage) progressStage.style.display = 'none';
    if (countdownStage) countdownStage.style.display = 'none';
    if (dialogActions) dialogActions.style.display = 'flex';
    modalCancelBtn.style.display = 'inline-flex';
    modalConfirmBtn.style.display = 'inline-flex';

    modalTitle.textContent = options.title;
    modalBody.innerHTML = options.body;
    modalConfirmBtn.textContent = options.confirmText ?? 'Apply';
    modalCancelBtn.textContent = options.cancelText ?? 'Cancel';
    setDialogIcon(dialogIcon, options.iconType ?? 'apply');

    dialog.disableClose = false;
    dialog.removeAttribute('disable-close');
    dialog.show();

    let settled = false;
    const cleanup = () => {
      modalConfirmBtn.removeEventListener('click', onConfirmClick);
      modalCancelBtn.removeEventListener('click', onCancelClick);
      dialog.removeEventListener('cancel', onCancelClick);
    };

    const onConfirmClick = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };

    const onCancelClick = () => {
      if (settled) return;
      settled = true;
      cleanup();
      dialog.hide('cancel');
      resolve(false);
    };

    modalConfirmBtn.addEventListener('click', onConfirmClick);
    modalCancelBtn.addEventListener('click', onCancelClick);
    dialog.addEventListener('cancel', onCancelClick);
  });

  if (!confirmed) {
    return false;
  }

  // Stage 2: Live Wavy Circular Progress Morph
  dialog.disableClose = true;
  dialog.setAttribute('disable-close', '');
  modalTitle.textContent = 'Applying...';
  modalBody.style.display = 'none';
  if (dialogActions) dialogActions.style.display = 'none';
  if (progressStage) progressStage.style.display = 'flex';
  if (progressBar) {
    progressBar.value = 0;
    progressBar.setAttribute('value', '0');
  }
  if (progressPct) progressPct.textContent = '0%';
  if (progressMsg) progressMsg.textContent = 'Preparing font payload...';

  const updateProgressUI = (percent: number, msg: string) => {
    const clamped = Math.max(0, Math.min(100, percent));
    if (progressBar) {
      progressBar.value = clamped;
      progressBar.setAttribute('value', String(clamped));
    }
    if (progressPct) progressPct.textContent = `${Math.round(clamped)}%`;
    if (progressMsg) progressMsg.textContent = msg;
  };

  try {
    await options.onApply(updateProgressUI);
  } catch (err) {
    // Stage 4: Error Handling
    dialog.disableClose = false;
    dialog.removeAttribute('disable-close');
    modalTitle.textContent = 'Apply Failed';
    setDialogIcon(dialogIcon, 'error');
    if (progressStage) progressStage.style.display = 'none';
    modalBody.style.display = 'block';
    const errText = err instanceof Error ? err.message : String(err);
    modalBody.innerHTML = `<span style="color: var(--md-sys-color-error); font-weight: 500;">${errText}</span>`;
    if (dialogActions) dialogActions.style.display = 'flex';
    modalCancelBtn.style.display = 'none';
    modalConfirmBtn.textContent = 'Dismiss';

    await new Promise<void>(resolve => {
      const onDismiss = () => {
        modalConfirmBtn.removeEventListener('click', onDismiss);
        dialog.hide('error');
        resolve();
      };
      modalConfirmBtn.addEventListener('click', onDismiss);
    });
    return false;
  }

  // Stage 3: Auto-Reboot 5-Second Countdown Morph
  dialog.disableClose = false;
  dialog.removeAttribute('disable-close');
  modalTitle.textContent = 'Applied Successfully!';
  setDialogIcon(dialogIcon, 'apply');
  if (progressStage) progressStage.style.display = 'none';
  if (countdownStage) countdownStage.style.display = 'flex';
  if (dialogActions) dialogActions.style.display = 'flex';
  modalCancelBtn.style.display = 'inline-flex';
  modalCancelBtn.textContent = "Don't Reboot";
  modalConfirmBtn.style.display = 'inline-flex';
  modalConfirmBtn.textContent = 'Reboot Now';

  let remaining = 5;
  if (countdownSec) countdownSec.textContent = '5';
  if (countdownBar) {
    countdownBar.value = 5;
    countdownBar.setAttribute('value', '5');
  }
  if (countdownMsg) countdownMsg.textContent = 'Rebooting in 5s to reload fonts...';

  await new Promise<void>(resolve => {
    let timerId: ReturnType<typeof setInterval> | null = null;

    const stopCountdown = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      dialog.hide('reboot');
      modalConfirmBtn.removeEventListener('click', onRebootNow);
      modalCancelBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
    };

    const onRebootNow = async () => {
      stopCountdown();
      resolve();
      await options.onReboot();
    };

    const onCancel = () => {
      stopCountdown();
      options.onCancelReboot?.();
      resolve();
    };

    timerId = setInterval(async () => {
      remaining -= 1;
      if (countdownSec) countdownSec.textContent = String(remaining);
      if (countdownBar) {
        countdownBar.value = Math.max(0, remaining);
        countdownBar.setAttribute('value', String(Math.max(0, remaining)));
      }
      if (countdownMsg) {
        countdownMsg.textContent = remaining > 0
          ? `Restarting in ${remaining}s to reload fonts...`
          : 'Restarting now...';
      }

      if (remaining <= 0) {
        stopCountdown();
        resolve();
        await options.onReboot();
      }
    }, 1000);

    modalConfirmBtn.addEventListener('click', onRebootNow);
    modalCancelBtn.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);
  });

  return true;
}
