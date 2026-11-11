/**
 * Fontify - Application Bootstrap Entrypoint
 */

import './styles/style.css';

import { store } from './state/store';
import { fontService } from './bridge/service';
import { themeManager } from './ui/theme';
import { setupOverviewTab } from './ui/overview';
import { setupCustomizeTab } from './ui/customize';
import { FontEngine } from './font/engine';

export function switchTab(tabId: 'overview' | 'customize'): void {
  document.querySelectorAll<HTMLElement>('.tab-view').forEach(view => {
    view.classList.remove('active');
    view.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('tabindex', '-1');
  });

  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) {
    targetView.classList.add('active');
    targetView.removeAttribute('aria-hidden');
  }

  const targetTab = document.querySelector<HTMLButtonElement>(`.nav-tab[data-tab="${tabId}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
    targetTab.setAttribute('aria-selected', 'true');
    targetTab.setAttribute('tabindex', '0');
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
    await fontService.refreshStatus();
  } catch (err) {
    // Graceful fallback: cached state remains rendered on screen
    console.warn('Background status sync error:', err);
  }
}

function init(): void {
  themeManager.init();
  setupOverviewTab();
  setupCustomizeTab();

  // Attach nav tab click listeners directly
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach(btn => {
    const tabName = btn.getAttribute('data-tab') as 'overview' | 'customize' | null;
    if (tabName) {
      btn.addEventListener('click', () => switchTab(tabName));
    }
  });

  // WAI-ARIA tablist keyboard interactions (Arrow navigation, Home, End)
  const tablist = document.querySelector<HTMLElement>('[role="tablist"]');
  if (tablist) {
    tablist.addEventListener('keydown', (e: KeyboardEvent) => {
      const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const activeIdx = tabs.findIndex(tab => tab === document.activeElement);
      if (activeIdx === -1) return;

      let nextIdx = activeIdx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (activeIdx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (activeIdx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = tabs.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      const target = tabs[nextIdx];
      if (target) {
        target.focus();
        const tabName = target.getAttribute('data-tab') as 'overview' | 'customize' | null;
        if (tabName) switchTab(tabName);
      }
    });
  }

  // Reconcile cached state with files on disk in background
  reconcileDiskStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
