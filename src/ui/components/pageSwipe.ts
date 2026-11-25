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
  onAnimateHighlighter?: (tab: FontifyTab) => void;
  onProgress?: (fromTab: FontifyTab, toTab: FontifyTab, progress: number) => void;
  onOverscroll?: (overscrollPx: number) => void;
  onResetSprings?: () => void;
}

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
  if (!container || !track) return () => {};

  let isPointerDown = false;
  let isTracking = false;
  let gestureType: 'none' | 'horizontal' | 'vertical' = 'none';
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let currentDeltaX = 0;

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
      if (!isPointerDown && track) {
        track.style.transition = '';
      }
    }, 400);
  }

  activeSlideToTab = moveToTab;

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Skip horizontal page gestures on interactive M3E controls, dialogs, sheets, sliders, and editable playgrounds
    if (
      target.closest(
        'm3e-bottom-sheet, m3e-dialog, m3e-slider, m3e-slider-thumb, m3e-search-bar, m3e-button-group, m3e-filter-chip-set, m3e-split-pane, input[type="range"], [contenteditable="true"], .emoji-category-bar, .emoji-showcase-grid, .m3-presets-scroll, #browse-search-input, .browse-filter-row, #browse-preview-sheet, .specimen-box'
      )
    ) {
      isPointerDown = false;
      isTracking = false;
      gestureType = 'none';
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;

    if (track) {
      track.style.transition = 'none';
    }

    isPointerDown = true;
    isTracking = false;
    gestureType = 'none';
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = startX;
    lastTime = performance.now();
    velocity = 0;
    currentDeltaX = 0;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isPointerDown || e.touches.length !== 1 || !container || !track) return;

    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (gestureType === 'none') {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < 8 && absY < 8) return;

      if (absX > absY * 1.2) {
        gestureType = 'horizontal';
        isTracking = true;
      } else {
        gestureType = 'vertical';
        isPointerDown = false;
        isTracking = false;
        return;
      }
    }

    if (!isTracking) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) {
      const instantV = (touch.clientX - lastX) / dt;
      velocity = velocity * 0.4 + instantV * 0.6;
    }
    lastX = touch.clientX;
    lastTime = now;

    const currentTab = store.getState().currentTab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    const width = container.offsetWidth;
    const baseOffset = -currentIndex * width;

    let effectiveDx = dx;
    let isOverscroll = false;

    if (currentIndex === 0 && dx > 0) {
      isOverscroll = true;
      effectiveDx = Math.pow(dx, 0.78) * 1.8;
    } else if (currentIndex === TAB_ORDER.length - 1 && dx < 0) {
      isOverscroll = true;
      effectiveDx = -Math.pow(-dx, 0.78) * 1.8;
    }

    currentDeltaX = effectiveDx;
    track.style.transform = `translate3d(${baseOffset + effectiveDx}px, 0, 0)`;

    if (isOverscroll) {
      options.onOverscroll?.(effectiveDx);
    } else {
      options.onOverscroll?.(0);
      const progress = Math.min(1, Math.max(0, Math.abs(dx) / width));
      if (dx < 0 && currentIndex < TAB_ORDER.length - 1) {
        options.onProgress?.(currentTab, TAB_ORDER[currentIndex + 1], progress);
      } else if (dx > 0 && currentIndex > 0) {
        options.onProgress?.(currentTab, TAB_ORDER[currentIndex - 1], progress);
      } else {
        options.onProgress?.(currentTab, currentTab, 0);
      }
    }
  }

  function handleTouchEnd() {
    if (!isPointerDown || !container || !track) return;
    isPointerDown = false;

    if (!isTracking) return;
    isTracking = false;

    const currentTab = store.getState().currentTab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    const width = container.offsetWidth;

    let targetIndex = currentIndex;
    const flickThreshold = 0.35;
    const distThreshold = width * 0.35;

    if (Math.abs(velocity) > flickThreshold) {
      if (velocity < 0 && currentIndex < TAB_ORDER.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (velocity > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    } else if (Math.abs(currentDeltaX) > distThreshold) {
      if (currentDeltaX < 0 && currentIndex < TAB_ORDER.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (currentDeltaX > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    }

    const targetTab = TAB_ORDER[targetIndex];
    options.onResetSprings?.();
    moveToTab(targetTab, false);

    if (targetTab !== currentTab) {
      options.onAnimateHighlighter?.(targetTab);
      options.onSettle(targetTab);
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

  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });

  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
    container.removeEventListener('touchcancel', handleTouchEnd);
    window.removeEventListener('resize', handleResize);
    if (activeSlideToTab === moveToTab) {
      activeSlideToTab = null;
    }
  };
}
