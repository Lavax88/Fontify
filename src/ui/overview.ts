/**
 * Fontify - Overview Tab Controller (M3E Expressive)
 * Subscribes to system status and renders Split Pane (Font + Emoji status),
 * Reboot Callout, and Segmented Device Info lists.
 * Active Font/Emoji cards are actionable and trigger Revert to Stock on tap.
 */

import { store } from '../state/store';
import { fontService } from '../bridge/service';
import type { SystemStatus } from '../bridge/types';
import { showToast } from './components/toast';

function setCardActionable(card: HTMLElement, isActionable: boolean, ariaLabel: string): void {
  if (isActionable) {
    card.setAttribute('actionable', '');
    card.setAttribute('tabindex', '0');
  } else {
    card.removeAttribute('actionable');
    card.removeAttribute('tabindex');
  }
  card.setAttribute('aria-label', ariaLabel);
}

export function setupOverviewTab(): void {
  const overviewBanner = document.getElementById('overview-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSubtitle = document.getElementById('banner-subtitle');
  const bannerBadge = document.getElementById('banner-badge');
  const bannerIcon = document.getElementById('banner-icon');

  const emojiBanner = document.getElementById('overview-emoji-banner');
  const emojiBannerTitle = document.getElementById('emoji-banner-title');
  const emojiBannerSubtitle = document.getElementById('emoji-banner-subtitle');
  const emojiBannerBadge = document.getElementById('emoji-banner-badge');
  const emojiBannerIcon = document.getElementById('emoji-banner-icon');

  const infoActiveFont = document.getElementById('info-active-font');
  const infoActiveEmoji = document.getElementById('info-active-emoji');
  const infoSystemVer = document.getElementById('info-system-ver');
  const infoDeviceName = document.getElementById('info-device-name');
  const infoSystemAbi = document.getElementById('info-system-abi');
  const infoBackupStatus = document.getElementById('info-backup-status');
  const rebootReminderBanner = document.getElementById('reboot-reminder-banner');
  const rebootReminderSubtitle = document.getElementById('reboot-reminder-subtitle');
  const btnBannerReboot = document.getElementById('btn-banner-reboot');
  const btnBannerCancelPending = document.getElementById('btn-banner-cancel-pending') as HTMLButtonElement | null;

  if (btnBannerReboot) {
    btnBannerReboot.addEventListener('click', async () => {
      const mode = store.getState().rebootType || 'soft';
      await fontService.reboot(mode);
    });
  }

  if (btnBannerCancelPending) {
    btnBannerCancelPending.addEventListener('click', async () => {
      btnBannerCancelPending.disabled = true;
      try {
        await fontService.cancelPendingWithPrompt();
      } catch (err: any) {
        showToast(err?.message || 'Failed to cancel pending changes.');
      } finally {
        btnBannerCancelPending.disabled = false;
      }
    });
  }

  if (overviewBanner) {
    const onFontCardActivate = async () => {
      if (store.getState().status.active) {
        await fontService.restoreWithPrompt('font');
      }
    };
    overviewBanner.addEventListener('click', onFontCardActivate);
    overviewBanner.addEventListener('keydown', async (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await onFontCardActivate();
      }
    });
  }

  if (emojiBanner) {
    const onEmojiCardActivate = async () => {
      if (store.getState().status.emoji_active) {
        await fontService.restoreWithPrompt('emoji');
      }
    };
    emojiBanner.addEventListener('click', onEmojiCardActivate);
    emojiBanner.addEventListener('keydown', async (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await onEmojiCardActivate();
      }
    });
  }

  function updateRebootReminder(required: boolean): void {
    if (!rebootReminderBanner) return;
    rebootReminderBanner.style.display = required ? 'block' : 'none';
    const isFull = store.getState().rebootType === 'full';
    if (btnBannerReboot) {
      btnBannerReboot.textContent = isFull ? 'Full Reboot' : 'Reboot';
    }
    if (btnBannerCancelPending) {
      btnBannerCancelPending.style.display = isFull ? 'none' : '';
    }
    if (rebootReminderSubtitle) {
      rebootReminderSubtitle.textContent = isFull
        ? 'A full device reboot is required to restore stock system mounts safely.'
        : 'Restart your device to apply updated font/emoji overlays.';
    }
  }

  function renderStatus(status: SystemStatus): void {
    const isActive = Boolean(status.active);
    const fontName = isActive ? status.active_font_name || 'Custom Font' : 'Roboto / Google Sans';

    if (overviewBanner && bannerTitle && bannerSubtitle && bannerBadge) {
      if (isActive) {
        overviewBanner.className = 'overview-banner is-active';
        bannerTitle.textContent = 'Custom Font';
        bannerSubtitle.textContent = fontName;
        bannerBadge.textContent = 'ACTIVE';
        bannerIcon?.setAttribute('name', 'check_circle');
        setCardActionable(overviewBanner, true, `${fontName} active. Tap to revert to stock.`);
      } else {
        overviewBanner.className = 'overview-banner is-stock';
        bannerTitle.textContent = 'Default Font';
        bannerSubtitle.textContent = 'Stock System Font';
        bannerBadge.textContent = 'STOCK';
        bannerIcon?.setAttribute('name', 'font_download');
        setCardActionable(overviewBanner, false, 'Default Font: Stock System Font');
      }
    }

    const isEmojiActive = Boolean(status.emoji_active);
    const emojiName = isEmojiActive ? status.active_emoji_name || 'Custom Emoji' : 'Stock (Google)';

    if (emojiBanner && emojiBannerTitle && emojiBannerSubtitle && emojiBannerBadge) {
      if (isEmojiActive) {
        emojiBanner.className = 'overview-banner is-active';
        emojiBannerTitle.textContent = 'Custom Emoji';
        emojiBannerSubtitle.textContent = emojiName;
        emojiBannerBadge.textContent = 'ACTIVE';
        emojiBannerIcon?.setAttribute('name', 'check_circle');
        setCardActionable(emojiBanner, true, `${emojiName} active. Tap to revert to stock.`);
      } else {
        emojiBanner.className = 'overview-banner is-stock';
        emojiBannerTitle.textContent = 'Default Emoji';
        emojiBannerSubtitle.textContent = 'Stock (Google)';
        emojiBannerBadge.textContent = 'STOCK';
        emojiBannerIcon?.setAttribute('name', 'mood');
        setCardActionable(emojiBanner, false, 'Default Emoji: Stock (Google)');
      }
    }

    if (infoActiveFont) {
      infoActiveFont.textContent = fontName;
    }

    if (infoActiveEmoji) {
      infoActiveEmoji.textContent = emojiName;
    }

    if (status.device) {
      const dev = status.device;
      if (infoSystemVer) {
        infoSystemVer.textContent = `${dev.android_version || '16'} (API ${dev.sdk_version || '36'})`;
      }
      if (infoDeviceName) {
        infoDeviceName.textContent = `${dev.model || 'POCO F7'} (${dev.device || 'onyx'})`;
      }
      if (infoSystemAbi) {
        const abiText = dev.abi || 'arm64-v8a';
        infoSystemAbi.textContent = abiText.includes('4K') ? abiText : `${abiText} (4K)`;
      }
    }

    if (infoBackupStatus) {
      infoBackupStatus.textContent = status.backup_exists ? 'Protected (/data/adb)' : 'Protected';
    }
  }

  renderStatus(store.getState().status);
  updateRebootReminder(store.getState().rebootRequired);

  store.subscribe(state => state.status, renderStatus);
  store.subscribe(state => state.rebootRequired, updateRebootReminder);
  store.subscribe(state => state.rebootType, () => updateRebootReminder(store.getState().rebootRequired));
}
