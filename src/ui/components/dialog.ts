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

const CIRCLE_CIRCUMFERENCE = 226.19; // 2 * PI * 36

export function showConfirmDialog(options: DialogOptions): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn') as HTMLButtonElement | null;
    const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLButtonElement | null;
    const iconSvg = document.getElementById('dialog-icon-svg');
    const progressStage = document.getElementById('dialog-progress-stage');
    const countdownStage = document.getElementById('dialog-countdown-stage');
    const dialogActions = document.getElementById('dialog-actions');

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

    // Reset stages
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

    if (iconSvg && options.iconType && DIALOG_ICONS[options.iconType]) {
      iconSvg.innerHTML = DIALOG_ICONS[options.iconType];
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;

    modalOverlay.classList.add('open');
    modalOverlay.removeAttribute('aria-hidden');
    modalConfirmBtn.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = [modalCancelBtn, modalConfirmBtn].filter(Boolean) as HTMLElement[];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const handleConfirm = () => {
      cleanup();
      modalOverlay.classList.remove('open');
      modalOverlay.setAttribute('aria-hidden', 'true');
      options.onConfirm?.();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      modalOverlay.classList.remove('open');
      modalOverlay.setAttribute('aria-hidden', 'true');
      options.onCancel?.();
      resolve(false);
    };

    const cleanup = () => {
      modalConfirmBtn.removeEventListener('click', handleConfirm);
      modalCancelBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };

    modalConfirmBtn.addEventListener('click', handleConfirm);
    modalCancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeyDown);
  });
}

/**
 * Runs the complete apply lifecycle:
 * 1. Prompts confirmation
 * 2. Morphs modal into live SVG circular progress meter with real-time percentages
 * 3. Morphs into 5-second countdown to automatic reboot with manual override
 */
export async function runApplyWorkflow(options: ApplyWorkflowOptions): Promise<boolean> {
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn') as HTMLButtonElement | null;
  const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLButtonElement | null;
  const iconSvg = document.getElementById('dialog-icon-svg');
  const progressStage = document.getElementById('dialog-progress-stage');
  const progressBar = document.getElementById('dialog-progress-bar') as SVGCircleElement | null;
  const progressPct = document.getElementById('dialog-progress-pct');
  const progressMsg = document.getElementById('dialog-progress-msg');
  const countdownStage = document.getElementById('dialog-countdown-stage');
  const countdownBar = document.getElementById('dialog-countdown-bar') as SVGCircleElement | null;
  const countdownSec = document.getElementById('dialog-countdown-sec');
  const countdownMsg = document.getElementById('dialog-countdown-msg');
  const dialogActions = document.getElementById('dialog-actions');

  if (!modalOverlay || !modalTitle || !modalBody || !modalConfirmBtn || !modalCancelBtn) {
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

    if (iconSvg && options.iconType && DIALOG_ICONS[options.iconType]) {
      iconSvg.innerHTML = DIALOG_ICONS[options.iconType];
    }

    modalOverlay.classList.add('open');
    modalOverlay.removeAttribute('aria-hidden');
    modalConfirmBtn.focus();

    const onConfirmClick = () => {
      cleanup();
      resolve(true);
    };

    const onCancelClick = () => {
      cleanup();
      modalOverlay.classList.remove('open');
      modalOverlay.setAttribute('aria-hidden', 'true');
      resolve(false);
    };

    const cleanup = () => {
      modalConfirmBtn.removeEventListener('click', onConfirmClick);
      modalCancelBtn.removeEventListener('click', onCancelClick);
    };

    modalConfirmBtn.addEventListener('click', onConfirmClick);
    modalCancelBtn.addEventListener('click', onCancelClick);
  });

  if (!confirmed) {
    return false;
  }

  // Stage 2: Live Circular Progress Morph
  modalTitle.textContent = 'Applying...';
  modalBody.style.display = 'none';
  if (dialogActions) dialogActions.style.display = 'none';
  if (progressStage) progressStage.style.display = 'flex';
  if (progressBar) progressBar.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE);
  if (progressPct) progressPct.textContent = '0%';
  if (progressMsg) progressMsg.textContent = 'Preparing font payload...';

  const updateProgressUI = (percent: number, msg: string) => {
    const clamped = Math.max(0, Math.min(100, percent));
    const offset = CIRCLE_CIRCUMFERENCE * (1 - clamped / 100);
    if (progressBar) progressBar.style.strokeDashoffset = String(offset);
    if (progressPct) progressPct.textContent = `${clamped}%`;
    if (progressMsg) progressMsg.textContent = msg;
  };

  try {
    await options.onApply(updateProgressUI);
  } catch (err) {
    // Stage 4: Error Handling
    modalTitle.textContent = 'Apply Failed';
    if (iconSvg) iconSvg.innerHTML = DIALOG_ICONS.error;
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
        modalOverlay.classList.remove('open');
        modalOverlay.setAttribute('aria-hidden', 'true');
        resolve();
      };
      modalConfirmBtn.addEventListener('click', onDismiss);
    });
    return false;
  }

  // Stage 3: Auto-Reboot 5-Second Countdown Morph
  modalTitle.textContent = 'Applied Successfully!';
  if (iconSvg) iconSvg.innerHTML = DIALOG_ICONS.apply;
  if (progressStage) progressStage.style.display = 'none';
  if (countdownStage) countdownStage.style.display = 'flex';
  if (dialogActions) dialogActions.style.display = 'flex';
  modalCancelBtn.style.display = 'inline-flex';
  modalCancelBtn.textContent = "Don't Reboot";
  modalConfirmBtn.style.display = 'inline-flex';
  modalConfirmBtn.textContent = 'Reboot Now';

  let remaining = 5;
  if (countdownSec) countdownSec.textContent = '5';
  if (countdownBar) countdownBar.style.strokeDashoffset = '0';
  if (countdownMsg) countdownMsg.textContent = 'Rebooting in 5s to reload fonts...';

  await new Promise<void>(resolve => {
    let timerId: ReturnType<typeof setInterval> | null = null;

    const stopCountdown = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      modalOverlay.classList.remove('open');
      modalOverlay.setAttribute('aria-hidden', 'true');
      modalConfirmBtn.removeEventListener('click', onRebootNow);
      modalCancelBtn.removeEventListener('click', onCancel);
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
        const offset = CIRCLE_CIRCUMFERENCE * (1 - remaining / 5);
        countdownBar.style.strokeDashoffset = String(offset);
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
  });

  return true;
}
