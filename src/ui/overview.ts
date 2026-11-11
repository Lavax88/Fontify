/**
 * Fontify - Overview Tab Controller
 * Subscribes to system status and renders Hero Banner and Device Info properties.
 */

import { store } from '../state/store';
import type { SystemStatus } from '../bridge/types';

export function setupOverviewTab(): void {
  const overviewBanner = document.getElementById('overview-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSubtitle = document.getElementById('banner-subtitle');
  const bannerBadge = document.getElementById('banner-badge');
  const infoActiveFont = document.getElementById('info-active-font');
  const infoSystemVer = document.getElementById('info-system-ver');
  const infoDeviceName = document.getElementById('info-device-name');
  const infoSystemAbi = document.getElementById('info-system-abi');
  const infoBackupStatus = document.getElementById('info-backup-status');

  function renderStatus(status: SystemStatus): void {
    const isActive = Boolean(status.active);
    const fontName = isActive ? status.active_font_name || 'Custom Font' : 'Roboto / Google Sans';

    if (overviewBanner && bannerTitle && bannerSubtitle && bannerBadge) {
      if (isActive) {
        overviewBanner.className = 'm3-banner-card is-active';
        bannerTitle.textContent = 'Activated';
        bannerSubtitle.textContent = `${fontName} (Active)`;
        bannerBadge.textContent = 'CUSTOM';
      } else {
        overviewBanner.className = 'm3-banner-card is-stock';
        bannerTitle.textContent = 'Default Font';
        bannerSubtitle.textContent = 'Stock System Font';
        bannerBadge.textContent = 'STOCK';
      }
    }

    if (infoActiveFont) {
      infoActiveFont.textContent = fontName;
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

  // Initial render with cached/default store data
  renderStatus(store.getState().status);

  // Subscribe to store updates for status slice
  store.subscribe(state => state.status, renderStatus);
}
