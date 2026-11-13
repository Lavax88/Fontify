/**
 * Fontify - Application Bootstrap Entrypoint
 */

import './styles/style.css';

import { store } from './state/store';
import { fontService } from './bridge/service';
import { themeManager } from './ui/theme';
import { setupOverviewTab } from './ui/overview';
import { setupCustomizeTab } from './ui/customize';
import { setupEmojiTab } from './ui/emoji';
import { initFloatingActions } from './ui/floatingActions';
import { FontEngine } from './font/engine';
import { initFloatingNav, type FloatingNavController, type FontifyTab } from './ui/components/floatingNav';
import { initPageSwipe, slideToTab } from './ui/components/pageSwipe';

let floatingNavController: FloatingNavController | null = null;

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

  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach(tab => {
    const tabName = (tab.getAttribute('data-tab') || tab.getAttribute('data-target')) as FontifyTab | null;
    const isTarget = tabName === tabId;
    tab.classList.toggle('active', isTarget);
    tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    tab.setAttribute('tabindex', isTarget ? '0' : '-1');
  });

  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) {
    targetView.scrollTo({ top: 0, behavior: 'smooth' });
  }

  store.setState({ currentTab: tabId });

  if (!skipSlide) {
    slideToTab(tabId);
  }

  // Update floating highlighter position smoothly
  floatingNavController?.updatePosition(false);

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
  setupEmojiTab();
  initFloatingActions();

  // Attach nav tab click listeners directly
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach(btn => {
    const tabName = (btn.getAttribute('data-tab') || btn.getAttribute('data-target')) as FontifyTab | null;
    if (tabName) {
      btn.addEventListener('click', () => switchTab(tabName));
    }
  });

  // Initialize floating navigation bar controller
  floatingNavController = initFloatingNav((target) => {
    switchTab(target);
  });

  // Initialize page swipe ViewPager
  initPageSwipe({
    onSettle: (settledTab) => {
      switchTab(settledTab, true);
    },
    onAnimateHighlighter: (targetTab) => {
      floatingNavController?.animateToTab(targetTab);
    },
    onProgress: (fromTab, toTab, progress) => {
      floatingNavController?.setProgress(fromTab, toTab, progress);
    },
    onOverscroll: (overscrollPx) => {
      floatingNavController?.setOverscroll(overscrollPx);
    },
    onResetSprings: () => {
      floatingNavController?.resetCapsuleSpring();
    }
  });

  // Ensure ViewPager starts aligned to current active tab
  slideToTab(store.getState().currentTab, true);

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
        const tabName = (target.getAttribute('data-tab') || target.getAttribute('data-target')) as FontifyTab | null;
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
