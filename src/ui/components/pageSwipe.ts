import { store } from '../../state/store';

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

export interface PageSwipeOptions {
  onSettle: (tab: FontifyTab) => void;
}

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

export function slideToTab(targetTab: FontifyTab, immediate = false): void {
  if (activeSlideToTab) {
    activeSlideToTab(targetTab, immediate);
  }
}

export function initPageSwipe(options: PageSwipeOptions): () => void {
  if (typeof document === 'undefined') return () => {};

  const container = document.getElementById('viewpager-container');
  const track = document.getElementById('viewpager-track');
  const swipeEl = document.getElementById('viewpager-swipe') as SwipeGestureElementLike | null;
  if (!container || !track) return () => {};

  let isSwiping = false;

  function moveToTab(targetTab: FontifyTab, immediate = false) {
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

  activeSlideToTab = moveToTab;

  if (swipeEl) {
    swipeEl.inputFilter = (input) => {
      const target = input?.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return true;
      return !target.closest(EXCLUDED_SWIPE_SELECTOR);
    };
  }

  function handleSwipeGesture(e: Event) {
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
        options.onSettle(targetTab);
      }
    }
  }

  let lastContainerWidth = container.offsetWidth;
  let resizeRafId: number | null = null;

  function handleResize() {
    const nextWidth = container?.offsetWidth ?? 0;
    if (nextWidth === lastContainerWidth) return;
    lastContainerWidth = nextWidth;

    if (resizeRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(resizeRafId);
    }

    const applyResize = () => {
      resizeRafId = null;
      const currentTab = store.getState().currentTab;
      moveToTab(currentTab, true);
    };

    if (typeof requestAnimationFrame === 'function') {
      resizeRafId = requestAnimationFrame(applyResize);
    } else {
      applyResize();
    }
  }

  swipeEl?.addEventListener('gesture', handleSwipeGesture);
  window.addEventListener('resize', handleResize, { passive: true });

  return () => {
    swipeEl?.removeEventListener('gesture', handleSwipeGesture);
    if (swipeEl) {
      swipeEl.inputFilter = undefined;
    }
    window.removeEventListener('resize', handleResize);
    if (activeSlideToTab === moveToTab) {
      activeSlideToTab = null;
    }
  };
}
