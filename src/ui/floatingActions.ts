/**
 * Fontify - M3E FAB Menu Controller (<m3e-fab-menu>)
 * Handles bottom-right FAB menu Reset and Apply actions for Customize and Emoji views.
 */

import { store } from '../state/store';
import { applySelectedFont, restoreStockFont } from './customize';
import { applySelectedEmoji, restoreStockEmoji } from './emoji';

type FabMenuItemElement = HTMLElement & { disabled?: boolean };
type FabMenuElement = HTMLElement & { hide?: (restoreFocus?: boolean) => void };

export function initFloatingActions(): { destroy: () => void } {
  const cluster = document.getElementById('floating-action-cluster');
  const fabMenu = document.getElementById('fab-actions-menu') as FabMenuElement | null;
  const fabReset = document.getElementById('fab-reset') as FabMenuItemElement | null;
  const fabApply = document.getElementById('fab-apply') as FabMenuItemElement | null;
  const fabApplyLabel = document.getElementById('fab-apply-label');
  const fabResetLabel = document.getElementById('fab-reset-label');

  if (!cluster || !fabReset || !fabApply) {
    return { destroy: () => {} };
  }

  function setItemDisabled(el: FabMenuItemElement, isDisabled: boolean): void {
    el.disabled = isDisabled;
    if (isDisabled) {
      el.setAttribute?.('disabled', '');
    } else {
      el.removeAttribute?.('disabled');
    }
  }

  function updateCluster(): void {
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
      setItemDisabled(fabApply, !state.fontBuffer || !state.fontData || state.isApplying);
      fabReset.setAttribute('title', 'Revert Font to Stock');
    } else if (tab === 'emoji') {
      if (fabApplyLabel) fabApplyLabel.textContent = 'Apply Emoji';
      if (fabResetLabel) fabResetLabel.textContent = 'Revert Emoji to Stock';
      fabApply.setAttribute('aria-label', 'Apply Emoji Font');
      setItemDisabled(fabApply, !state.emojiBuffer || state.isApplyingEmoji);
      fabReset.setAttribute('title', 'Revert Emoji to Stock');
    }
  }

  const onApplyClick = async () => {
    fabMenu?.hide?.(false);
    const tab = store.getState().currentTab;
    if (tab === 'customize') {
      await applySelectedFont();
    } else if (tab === 'emoji') {
      await applySelectedEmoji();
    }
  };

  const onResetClick = async () => {
    fabMenu?.hide?.(false);
    const tab = store.getState().currentTab;
    if (tab === 'customize') {
      await restoreStockFont();
    } else if (tab === 'emoji') {
      await restoreStockEmoji();
    }
  };

  fabApply.addEventListener('click', onApplyClick);
  fabReset.addEventListener('click', onResetClick);

  const unsubTab = store.subscribe(s => s.currentTab, () => updateCluster());
  const unsubFont = store.subscribe(s => s.fontBuffer, () => updateCluster());
  const unsubEmoji = store.subscribe(s => s.emojiBuffer, () => updateCluster());
  const unsubApplyingFont = store.subscribe(s => s.isApplying, () => updateCluster());
  const unsubApplyingEmoji = store.subscribe(s => s.isApplyingEmoji, () => updateCluster());

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
