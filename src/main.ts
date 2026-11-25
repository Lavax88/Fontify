/**
 * Fontify - Application Bootstrap Entrypoint (M3E Expressive)
 */

import './ui/m3e';
import './styles/style.css';

import { store } from './state/store';
import { fontService } from './bridge/service';
import { themeManager } from './ui/theme';
import { setupOverviewTab } from './ui/overview';
import { setupBrowseTab } from './ui/browse';
import { setupCustomizeTab } from './ui/customize';
import { setupEmojiTab } from './ui/emoji';
import { initFloatingActions } from './ui/floatingActions';
import { FontEngine } from './font/engine';
import { initPageSwipe, slideToTab, type FontifyTab } from './ui/components/pageSwipe';

interface AppBarAttachable extends HTMLElement {
  attach?: (control: HTMLElement) => void;
}

interface NavBarElement extends HTMLElement {
  selected?: HTMLElement | null;
}

interface NavItemElement extends HTMLElement {
  selected?: boolean;
}

export function switchTab(tabId: FontifyTab, skipSlide = false): void {
  document.querySelectorAll<HTMLElement>('.tab-view').forEach(view => {
    const isTarget = view.id === `view-${tabId}`;
    view.classList.toggle('active', isTarget);
    if (isTarget) {
      view.removeAttribute('aria-hidden');
    } else {
      view.setAttribute('aria-hidden', 'true');
    }
  });

  document.querySelectorAll<NavItemElement>('m3e-nav-item').forEach(item => {
    const tabName = item.getAttribute('data-tab') as FontifyTab | null;
    const isTarget = tabName === tabId;
    item.selected = isTarget;
    if (isTarget) {
      item.setAttribute('selected', '');
    } else {
      item.removeAttribute('selected');
    }
  });

  const targetView = document.getElementById(`view-${tabId}`);
  const appBar = document.getElementById('app-bar') as AppBarAttachable | null;
  if (targetView) {
    appBar?.attach?.(targetView);
  }

  store.setState({ currentTab: tabId });

  if (!skipSlide) {
    slideToTab(tabId);
  }

  // Lazy refresh font preview when customize tab becomes visible
  if (tabId === 'customize') {
    const previewElements = Array.from(document.querySelectorAll<HTMLElement>('.preview-text'));
    FontEngine.scheduleVariationUpdate(previewElements, store.getState().axisValues);
  }
}

// Attach to window for legacy callers if present
window.switchTab = switchTab;

async function reconcileDiskStatus(): Promise<void> {
  try {
    await fontService.refreshStatus();
  } catch (err) {
    console.warn('Background status sync error:', err);
  }
}

function init(): void {
  themeManager.init();
  setupOverviewTab();
  setupBrowseTab();
  setupCustomizeTab();
  setupEmojiTab();
  initFloatingActions();

  const navBar = document.getElementById('main-nav-bar') as NavBarElement | null;
  if (navBar) {
    navBar.addEventListener('change', () => {
      const selectedTab = navBar.selected?.getAttribute('data-tab') as FontifyTab | null;
      if (selectedTab && selectedTab !== store.getState().currentTab) {
        switchTab(selectedTab);
      }
    });
  }

  document.querySelectorAll<NavItemElement>('m3e-nav-item').forEach(item => {
    const tabName = item.getAttribute('data-tab') as FontifyTab | null;
    if (tabName) {
      item.addEventListener('click', () => {
        if (tabName === store.getState().currentTab) {
          document.getElementById(`view-${tabName}`)?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  });

  // Initialize page swipe ViewPager
  initPageSwipe({
    onSettle: (settledTab) => {
      switchTab(settledTab, true);
    }
  });

  // Ensure ViewPager & app bar start aligned to current active tab
  const initialTab = store.getState().currentTab;
  slideToTab(initialTab, true);
  const initialView = document.getElementById(`view-${initialTab}`);
  const appBar = document.getElementById('app-bar') as AppBarAttachable | null;
  if (initialView) {
    appBar?.attach?.(initialView);
  }

  reconcileDiskStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
