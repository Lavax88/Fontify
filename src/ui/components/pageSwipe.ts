import { store } from '../../state/store';
import type { FontifyTab } from './floatingNav';

export const TAB_ORDER: FontifyTab[] = [
  'overview',
  'customize',
  'emoji'
];

export interface PageSwipeOptions {
  onSettle: (tab: FontifyTab) => void;
  onAnimateHighlighter: (tab: FontifyTab) => void;
  onProgress: (fromTab: FontifyTab, toTab: FontifyTab, progress: number) => void;
  onOverscroll: (overscrollPx: number) => void;
  onResetSprings: () => void;
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
    const targetOffset = -targetIndex * width;

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

    // Skip horizontal page gestures on interactive controls, modal sheets/dialogs, sliders, and editable playgrounds
    if (
      target.closest(
        '.m3-bottom-sheet, .m3-dialog, .m3-sheet-backdrop, .m3-dialog-backdrop, input[type="range"], .m3-slider, [contenteditable="true"], .emoji-category-bar, .emoji-showcase-grid'
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
    isTracking = true;
    gestureType = 'none';
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = touch.clientX;
    lastTime = performance.now();
    velocity = 0;
    currentDeltaX = 0;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isTracking || !isPointerDown || e.touches.length !== 1) return;

    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    const now = performance.now();
    const dt = Math.max(1, now - lastTime);
    const instantVelocity = (touch.clientX - lastX) / dt;
    velocity = velocity * 0.65 + instantVelocity * 0.35;
    lastX = touch.clientX;
    lastTime = now;

    // Slope check on initial drag (horizontal dominant vs vertical scrolling)
    if (gestureType === 'none') {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > 8 || absY > 8) {
        if (absX > absY * 1.2) {
          gestureType = 'horizontal';
          document.querySelector('.bottom-nav')?.classList.add('nav-swiping');
        } else {
          // Vertical dominant -> surrender gesture to native vertical scroll
          gestureType = 'vertical';
          isTracking = false;
          return;
        }
      } else {
        return;
      }
    }

    if (gestureType !== 'horizontal') return;

    // Lock horizontal gesture: prevent native vertical scrolling while swiping
    if (e.cancelable) e.preventDefault();

    const containerWidth = container!.offsetWidth;
    const currentTab = store.getState().currentTab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);

    // Elastic rubber-band resistance at boundaries
    let effectiveDeltaX = dx;
    let isOverscrolling = false;

    if (currentIndex === 0 && dx > 0) {
      isOverscrolling = true;
      effectiveDeltaX = Math.pow(dx, 0.78) * 1.8;
    } else if (currentIndex === TAB_ORDER.length - 1 && dx < 0) {
      isOverscrolling = true;
      effectiveDeltaX = -Math.pow(Math.abs(dx), 0.78) * 1.8;
    }

    currentDeltaX = effectiveDeltaX;

    // Update ViewPager track live
    const baseOffset = -currentIndex * containerWidth;
    track!.style.transition = 'none';
    track!.style.transform = `translate3d(${baseOffset + effectiveDeltaX}px, 0, 0)`;

    // Update Floating Navbar live
    if (isOverscrolling) {
      options.onOverscroll(effectiveDeltaX);
    } else {
      options.onOverscroll(0);
      const fromTab = TAB_ORDER[currentIndex] || currentTab;
      let toTab: FontifyTab = fromTab;
      let progress = 0;

      if (dx < 0 && currentIndex < TAB_ORDER.length - 1) {
        toTab = TAB_ORDER[currentIndex + 1] ?? fromTab;
        progress = Math.min(1, Math.abs(dx) / containerWidth);
      } else if (dx > 0 && currentIndex > 0) {
        toTab = TAB_ORDER[currentIndex - 1] ?? fromTab;
        progress = Math.min(1, Math.abs(dx) / containerWidth);
      }

      options.onProgress(fromTab, toTab, progress);
    }
  }

  function handleTouchEnd() {
    document.querySelector('.bottom-nav')?.classList.remove('nav-swiping');

    if (!isPointerDown) return;
    isPointerDown = false;

    if (gestureType !== 'horizontal') {
      isTracking = false;
      gestureType = 'none';
      options.onResetSprings();
      return;
    }

    isTracking = false;
    gestureType = 'none';

    const containerWidth = container!.offsetWidth;
    const currentTab = store.getState().currentTab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);

    const dx = currentDeltaX;
    const isFlick = Math.abs(velocity) > 0.35;
    const distanceThreshold = containerWidth * 0.35;

    let targetIndex = currentIndex;

    if (currentIndex === 0 && dx > 0) {
      targetIndex = 0;
    } else if (currentIndex === TAB_ORDER.length - 1 && dx < 0) {
      targetIndex = TAB_ORDER.length - 1;
    } else if (isFlick) {
      if (velocity < -0.35 && currentIndex < TAB_ORDER.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (velocity > 0.35 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    } else if (Math.abs(dx) > distanceThreshold) {
      if (dx < 0 && currentIndex < TAB_ORDER.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (dx > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    }

    const targetTab = TAB_ORDER[targetIndex] || currentTab;

    // Immediately animate highlighter to target tab in sync with track
    options.onAnimateHighlighter(targetTab);

    // Animate track to target tab
    track!.style.transition = 'transform 0.35s cubic-bezier(0.28, 1.18, 0.5, 1)';
    track!.style.transform = `translate3d(${-targetIndex * containerWidth}px, 0, 0)`;

    // Spring capsule back to rest
    options.onResetSprings();

    // Settle store and active classes
    options.onSettle(targetTab);

    setTimeout(() => {
      if (!isPointerDown && track) track.style.transition = '';
    }, 360);
  }

  function handleTouchCancel() {
    document.querySelector('.bottom-nav')?.classList.remove('nav-swiping');
    if (!isPointerDown) return;
    isPointerDown = false;
    isTracking = false;
    gestureType = 'none';

    const currentTab = store.getState().currentTab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    const containerWidth = container!.offsetWidth;

    track!.style.transition = 'transform 0.35s cubic-bezier(0.28, 1.18, 0.5, 1)';
    track!.style.transform = `translate3d(${-currentIndex * containerWidth}px, 0, 0)`;
    options.onAnimateHighlighter(currentTab);
    options.onResetSprings();

    setTimeout(() => {
      if (!isPointerDown && track) track.style.transition = '';
    }, 360);
  }

  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  const handleResize = () => {
    const activeTab = store.getState().currentTab;
    moveToTab(activeTab, true);
  };
  window.addEventListener('resize', handleResize);

  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
    container.removeEventListener('touchcancel', handleTouchCancel);
    window.removeEventListener('resize', handleResize);
    activeSlideToTab = null;
  };
}
