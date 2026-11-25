/**
 * Fontify - Navigation & Chrome Coordinator
 * Consolidates 4-tab switching, ViewPager swipe gestures, AppBar scroll attachment,
 * and floating action cluster visibility/state behind one interface.
 */

import { store } from '../state/store';
import { FontEngine } from '../font/engine';
import { applySelectedFont, restoreStockFont } from './customize';
import { applySelectedEmoji, restoreStockEmoji } from './emoji';

export type FontifyTab = 'overview' | 'browse' | 'customize' | 'emoji';

export const TAB_ORDER: FontifyTab[] = [
  'overview',
  'browse',
  'customize',
  'emoji'
];

export function getTabOffset(targetTab: FontifyTab, containerWidth: number): number {
  const targetIndex = TAB_ORDER.indexOf(targetTab);
  if (targetIndex <= 0) return 0;
  return -targetIndex * containerWidth;
}

interface AppBarAttachable extends HTMLElement {
  attach?: (control: HTMLElement) => void;
}

interface NavBarElement extends HTMLElement {
  selected?: HTMLElement | null;
}

interface NavItemElement extends HTMLElement {
  selected?: boolean;
}

type FabMenuItemElement = HTMLElement & { disabled?: boolean };
type FabMenuElement = HTMLElement & { hide?: (restoreFocus?: boolean) => void };

interface SwipeGestureDetailLike {
  phase?: 'start' | 'move' | 'end' | 'cancel';
  direction?: 'left' | 'right' | 'up' | 'down';
  axis?: 'x' | 'y';
  translationX?: number;
  velocityX?: number;
}

type SwipeGestureElementLike = HTMLElement & {
  inputFilter?: (input: { target?: EventTarget | null }) => boolean;
};

const EXCLUDED_SWIPE_SELECTOR =
  'm3e-bottom-sheet, m3e-dialog, m3e-slider, m3e-slider-thumb, m3e-search-bar, m3e-button-group, m3e-filter-chip-set, m3e-split-pane, input[type="range"], [contenteditable="true"], .emoji-category-bar, .emoji-showcase-grid, .m3-presets-scroll, #browse-search-input, .browse-filter-row, #browse-preview-sheet, .specimen-box';

let activeSlideToTab: ((targetTab: FontifyTab, immediate?: boolean) => void) | null = null;

export function navigateToTab(tabId: FontifyTab, skipSlide = false): void {
  if (typeof document !== 'undefined') {
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
  }

  store.setState({ currentTab: tabId });

  if (!skipSlide && activeSlideToTab) {
    activeSlideToTab(tabId, false);
  }

  if (tabId === 'customize' && typeof document !== 'undefined') {
    const previewElements = Array.from(document.querySelectorAll<HTMLElement>('.preview-text'));
    FontEngine.scheduleVariationUpdate(previewElements, store.getState().axisValues);
  }
}

function setFabItemDisabled(el: FabMenuItemElement, isDisabled: boolean): void {
  el.disabled = isDisabled;
  if (isDisabled) {
    el.setAttribute?.('disabled', '');
  } else {
    el.removeAttribute?.('disabled');
  }
}

export function initNavigation(): { destroy: () => void } {
  if (typeof document === 'undefined') {
    return { destroy: () => {} };
  }

  const container = document.getElementById('viewpager-container');
  const track = document.getElementById('viewpager-track');
  const swipeEl = document.getElementById('viewpager-swipe') as SwipeGestureElementLike | null;
  const navBar = document.getElementById('main-nav-bar') as NavBarElement | null;
  const navItems = Array.from(document.querySelectorAll<NavItemElement>('m3e-nav-item') ?? []);

  const cluster = document.getElementById('floating-action-cluster');
  const fabMenu = document.getElementById('fab-actions-menu') as FabMenuElement | null;
  const fabReset = document.getElementById('fab-reset') as FabMenuItemElement | null;
  const fabApply = document.getElementById('fab-apply') as FabMenuItemElement | null;
  const fabApplyLabel = document.getElementById('fab-apply-label');
  const fabResetLabel = document.getElementById('fab-reset-label');

  let isSwiping = false;
  let resizeRafId: number | null = null;
  let lastContainerWidth = container?.offsetWidth ?? 0;

  function moveToTab(targetTab: FontifyTab, immediate = false): void {
    if (!track || !container) return;
    const targetIndex = TAB_ORDER.indexOf(targetTab);
    if (targetIndex === -1) return;

    const width = container.offsetWidth;
    const targetOffset = getTabOffset(targetTab, width);

    if (immediate) {
      track.style.transition = 'none';
      track.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
      return;
    }

    track.style.transition = 'transform 0.38s cubic-bezier(0.28, 1.18, 0.5, 1)';
    track.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
    setTimeout(() => {
      if (!isSwiping && track) {
        track.style.transition = '';
      }
    }, 400);
  }

  if (container && track) {
    activeSlideToTab = moveToTab;
  }

  if (swipeEl) {
    swipeEl.inputFilter = (input) => {
      const target = input?.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return true;
      return !target.closest(EXCLUDED_SWIPE_SELECTOR);
    };
  }

  function handleSwipeGesture(e: Event): void {
    if (!container || !track) return;
    const detail = (e as CustomEvent<SwipeGestureDetailLike>).detail;
    if (!detail) return;

    const currentTab = store.getState().currentTab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    const width = container.offsetWidth || 1;
    const baseOffset = -currentIndex * width;
    const dx = detail.translationX ?? 0;

    if (detail.phase === 'start') {
      isSwiping = true;
      track.style.transition = 'none';
      return;
    }

    if (detail.phase === 'move') {
      if (detail.axis === 'y') return;
      isSwiping = true;
      track.style.transition = 'none';

      let effectiveDx = dx;
      if (currentIndex === 0 && dx > 0) {
        effectiveDx = Math.pow(dx, 0.78) * 1.8;
      } else if (currentIndex === TAB_ORDER.length - 1 && dx < 0) {
        effectiveDx = -Math.pow(-dx, 0.78) * 1.8;
      }
      track.style.transform = `translate3d(${baseOffset + effectiveDx}px, 0, 0)`;
      return;
    }

    if (detail.phase === 'cancel') {
      isSwiping = false;
      moveToTab(currentTab, false);
      return;
    }

    if (detail.phase === 'end' || !detail.phase) {
      isSwiping = false;
      let targetIndex = currentIndex;
      const vx = detail.velocityX ?? 0;

      if (detail.direction === 'left' && currentIndex < TAB_ORDER.length - 1) {
        if (Math.abs(vx) > 0.2 || Math.abs(dx) > width * 0.25 || detail.translationX === undefined) {
          targetIndex = currentIndex + 1;
        }
      } else if (detail.direction === 'right' && currentIndex > 0) {
        if (Math.abs(vx) > 0.2 || Math.abs(dx) > width * 0.25 || detail.translationX === undefined) {
          targetIndex = currentIndex - 1;
        }
      }

      const targetTab = TAB_ORDER[targetIndex];
      moveToTab(targetTab, false);
      if (targetTab !== currentTab) {
        navigateToTab(targetTab, true);
      }
    }
  }

  function handleResize(): void {
    const nextWidth = container?.offsetWidth ?? 0;
    if (nextWidth === lastContainerWidth) return;
    lastContainerWidth = nextWidth;

    if (resizeRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(resizeRafId);
    }

    const applyResize = () => {
      resizeRafId = null;
      moveToTab(store.getState().currentTab, true);
    };

    if (typeof requestAnimationFrame === 'function') {
      resizeRafId = requestAnimationFrame(applyResize);
    } else {
      applyResize();
    }
  }

  const onNavChange = () => {
    const selectedTab = navBar?.selected?.getAttribute('data-tab') as FontifyTab | null;
    if (selectedTab && selectedTab !== store.getState().currentTab) {
      navigateToTab(selectedTab);
    }
  };

  const navClickHandlers: Array<{ item: NavItemElement; handler: () => void }> = [];
  for (const item of navItems) {
    const tabName = item.getAttribute('data-tab') as FontifyTab | null;
    if (tabName) {
      const handler = () => {
        if (tabName === store.getState().currentTab) {
          document.getElementById(`view-${tabName}`)?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
      item.addEventListener('click', handler);
      navClickHandlers.push({ item, handler });
    }
  }

  function updateFabCluster(): void {
    if (!cluster || !fabReset || !fabApply) return;
    const state = store.getState();
    const tab = state.currentTab;

    if (tab === 'overview' || tab === 'browse') {
      cluster.classList.add('hidden');
      fabMenu?.hide?.(false);
      return;
    }

    cluster.classList.remove('hidden');

    if (tab === 'customize') {
      if (fabApplyLabel) fabApplyLabel.textContent = 'Apply Font';
      if (fabResetLabel) fabResetLabel.textContent = 'Revert Font to Stock';
      fabApply.setAttribute('aria-label', 'Apply Custom Font');
      setFabItemDisabled(fabApply, !state.fontBuffer || !state.fontData || state.isApplying);
      fabReset.setAttribute('title', 'Revert Font to Stock');
      setFabItemDisabled(fabReset, !state.status.active || state.isRestoring);
    } else if (tab === 'emoji') {
      if (fabApplyLabel) fabApplyLabel.textContent = 'Apply Emoji';
      if (fabResetLabel) fabResetLabel.textContent = 'Revert Emoji to Stock';
      fabApply.setAttribute('aria-label', 'Apply Emoji Font');
      setFabItemDisabled(fabApply, !state.emojiBuffer || state.isApplyingEmoji);
      fabReset.setAttribute('title', 'Revert Emoji to Stock');
      setFabItemDisabled(fabReset, !state.status.emoji_active || state.isRestoringEmoji);
    }
  }

  const onApplyClick = async () => {
    if (!fabApply || fabApply.disabled) return;
    fabMenu?.hide?.(false);
    const tab = store.getState().currentTab;
    if (tab === 'customize') {
      await applySelectedFont();
    } else if (tab === 'emoji') {
      await applySelectedEmoji();
    }
  };

  const onResetClick = async () => {
    if (!fabReset || fabReset.disabled) return;
    fabMenu?.hide?.(false);
    const tab = store.getState().currentTab;
    if (tab === 'customize') {
      await restoreStockFont();
    } else if (tab === 'emoji') {
      await restoreStockEmoji();
    }
  };

  navBar?.addEventListener('change', onNavChange);
  swipeEl?.addEventListener('gesture', handleSwipeGesture);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize, { passive: true });
  }
  fabApply?.addEventListener('click', onApplyClick);
  fabReset?.addEventListener('click', onResetClick);

  const unsubChrome = store.subscribe(
    s => `${s.currentTab}|${Boolean(s.fontBuffer)}|${Boolean(s.fontData)}|${Boolean(s.emojiBuffer)}|${s.status.active}|${Boolean(s.status.emoji_active)}|${s.isApplying}|${s.isApplyingEmoji}|${s.isRestoring}|${s.isRestoringEmoji}`,
    () => updateFabCluster()
  );

  // Align ViewPager, AppBar, and FAB cluster to initial tab
  const initialTab = store.getState().currentTab;
  moveToTab(initialTab, true);
  const initialView = document.getElementById(`view-${initialTab}`);
  const appBar = document.getElementById('app-bar') as AppBarAttachable | null;
  if (initialView) {
    appBar?.attach?.(initialView);
  }
  updateFabCluster();

  return {
    destroy: () => {
      navBar?.removeEventListener('change', onNavChange);
      for (const { item, handler } of navClickHandlers) {
        item.removeEventListener('click', handler);
      }
      swipeEl?.removeEventListener('gesture', handleSwipeGesture);
      if (swipeEl) {
        swipeEl.inputFilter = undefined;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      fabApply?.removeEventListener('click', onApplyClick);
      fabReset?.removeEventListener('click', onResetClick);
      unsubChrome();
      if (activeSlideToTab === moveToTab) {
        activeSlideToTab = null;
      }
    }
  };
}
