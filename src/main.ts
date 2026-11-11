/**
 * Fontify - Application Bootstrap Entrypoint
 */

import './styles/style.css';

import { store } from './state/store';
import { saveCachedStatus } from './state/cache';
import { getSystemStatus } from './bridge/scripts';
import { setupTheming, setupUserCustomization } from './ui/insets-theme';
import { setupOverviewTab } from './ui/overview';
import { setupCustomizeTab } from './ui/customize';
import { FontEngine } from './font/engine';

export function switchTab(tabId: 'overview' | 'customize'): void {
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  const targetTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  store.setState({ currentTab: tabId });

  // Lazy refresh font preview when customize tab becomes visible
  if (tabId === 'customize') {
    const previewElements = Array.from(document.querySelectorAll<HTMLElement>('.preview-text'));
    FontEngine.scheduleVariationUpdate(previewElements, store.getState().axisValues);
  }
}

// Attach to window for legacy onclick handlers if present in DOM
window.switchTab = switchTab;

async function reconcileDiskStatus(): Promise<void> {
  try {
    store.setState({ statusLoading: true, statusError: null });
    const diskStatus = await getSystemStatus();

    store.setState({
      status: diskStatus,
      statusLoading: false
    });

    // Update versioned cache with ground-truth status from disk
    saveCachedStatus(diskStatus.active, diskStatus.active_font_name, diskStatus.device);
  } catch (err) {
    // Graceful fallback: cached state remains rendered on screen
    console.warn('Background status sync error:', err);
    store.setState({
      statusLoading: false,
      statusError: err instanceof Error ? err.message : String(err)
    });
  }
}

function init(): void {
  setupTheming();
  setupUserCustomization();
  setupOverviewTab();
  setupCustomizeTab();

  // Attach nav tab click listeners directly
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach(btn => {
    const tabName = btn.getAttribute('data-tab') as 'overview' | 'customize' | null;
    if (tabName) {
      btn.addEventListener('click', () => switchTab(tabName));
    }
  });

  // Reconcile cached state with files on disk in background
  reconcileDiskStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
