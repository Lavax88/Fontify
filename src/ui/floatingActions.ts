/**
 * Fontify - Dual Floating Action Cluster Controller (M3 Expressive)
 * Handles bottom-right floating Reset and Apply actions for Customize and Emoji views.
 */

import { store } from '../state/store';
import { applySelectedFont, restoreStockFont } from './customize';
import { applySelectedEmoji, restoreStockEmoji } from './emoji';

export function initFloatingActions(): { destroy: () => void } {
  const cluster = document.getElementById('floating-action-cluster');
  const fabReset = document.getElementById('fab-reset') as HTMLButtonElement | null;
  const fabApply = document.getElementById('fab-apply') as HTMLButtonElement | null;
  const fabApplyLabel = document.getElementById('fab-apply-label');

  if (!cluster || !fabReset || !fabApply) {
    return { destroy: () => {} };
  }

  function updateCluster(): void {
    if (!cluster || !fabReset || !fabApply) return;
    const state = store.getState();
    const tab = state.currentTab;

    if (tab === 'overview') {
      cluster.classList.add('hidden');
      return;
    }

    cluster.classList.remove('hidden');

    if (tab === 'customize') {
      if (fabApplyLabel) fabApplyLabel.textContent = 'Apply Font';
      fabApply.setAttribute('aria-label', 'Apply Custom Font');
      fabApply.disabled = !state.fontBuffer || !state.fontData || state.isApplying;
      fabReset.setAttribute('title', 'Revert Font to Stock');
    } else if (tab === 'emoji') {
      if (fabApplyLabel) fabApplyLabel.textContent = 'Apply Emoji';
      fabApply.setAttribute('aria-label', 'Apply Emoji Font');
      fabApply.disabled = !state.emojiBuffer || state.isApplyingEmoji;
      fabReset.setAttribute('title', 'Revert Emoji to Stock');
    }
  }

  const onApplyClick = async () => {
    const tab = store.getState().currentTab;
    if (tab === 'customize') {
      await applySelectedFont();
    } else if (tab === 'emoji') {
      await applySelectedEmoji();
    }
  };

  const onResetClick = async () => {
    const tab = store.getState().currentTab;
    if (tab === 'customize') {
      await restoreStockFont();
    } else if (tab === 'emoji') {
      await restoreStockEmoji();
    }
  };

  fabApply.addEventListener('click', onApplyClick);
  fabReset.addEventListener('click', onResetClick);

  // Subscribe to state slices
  const unsubTab = store.subscribe(s => s.currentTab, () => updateCluster());
  const unsubFont = store.subscribe(s => s.fontBuffer, () => updateCluster());
  const unsubEmoji = store.subscribe(s => s.emojiBuffer, () => updateCluster());
  const unsubApplyingFont = store.subscribe(s => s.isApplying, () => updateCluster());
  const unsubApplyingEmoji = store.subscribe(s => s.isApplyingEmoji, () => updateCluster());

  // Initial update
  updateCluster();

  return {
    destroy: () => {
      fabApply.removeEventListener('click', onApplyClick);
      fabReset.removeEventListener('click', onResetClick);
      unsubTab();
      unsubFont();
      unsubEmoji();
      unsubApplyingFont();
      unsubApplyingEmoji();
    }
  };
}
