/**
 * Fontify - Deep System Font & Overlay Lifecycle Module
 * Consolidates status inspection, chunked streaming, script execution,
 * state & cache persistence, pending-reboot tracking, and prompt-driven workflows.
 */

import {
  getSystemStatus,
  applyFont as runApplyFont,
  restoreStock as runRestoreStock,
  applyEmoji as runApplyEmoji,
  restoreEmojiStock as runRestoreEmojiStock,
  rebootDevice as runRebootDevice,
  fullRebootDevice as runFullRebootDevice,
  findLocalDownload
} from './scripts';
import type { SystemStatus, ScriptActionResult, ApplyFontParams, ApplyEmojiParams } from './types';
import { store, Store } from '../state/store';
import { saveCachedStatus } from '../state/cache';
import { showConfirmDialog, runApplyWorkflow, type DialogOptions, type ApplyWorkflowOptions } from '../ui/components/dialog';
import { showToast } from '../ui/components/toast';

export type FontApplyOptions = ApplyFontParams;
export type EmojiApplyOptions = ApplyEmojiParams;

export interface OverlayPromptAdapter {
  confirm: (options: DialogOptions) => Promise<boolean>;
  runApply: (options: ApplyWorkflowOptions) => Promise<boolean>;
  notify: (message: string) => void;
}

const defaultPromptAdapter: OverlayPromptAdapter = {
  confirm: (opts) => showConfirmDialog(opts),
  runApply: (opts) => runApplyWorkflow(opts),
  notify: (msg) => showToast(msg)
};

export class SystemFontService {
  constructor(
    private appStore: Store = store,
    private promptAdapter: OverlayPromptAdapter = defaultPromptAdapter
  ) {}

  private syncStatusAndCache(patch: Partial<SystemStatus>): void {
    const nextStatus = { ...this.appStore.getState().status, ...patch };
    saveCachedStatus(
      nextStatus.active,
      nextStatus.active_font_name,
      nextStatus.device,
      nextStatus.emoji_active ?? false,
      nextStatus.active_emoji_name ?? 'Stock (Google)'
    );
    this.appStore.setState({ status: nextStatus });
  }

  public async refreshStatus(): Promise<SystemStatus> {
    this.appStore.setState({ statusLoading: true, statusError: null });
    try {
      const diskStatus = await getSystemStatus();
      this.appStore.setState({
        status: diskStatus,
        statusLoading: false
      });
      saveCachedStatus(
        diskStatus.active,
        diskStatus.active_font_name,
        diskStatus.device,
        diskStatus.emoji_active ?? false,
        diskStatus.active_emoji_name ?? 'Stock (Google)'
      );
      return diskStatus;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.appStore.setState({
        statusLoading: false,
        statusError: errMsg
      });
      throw err;
    }
  }

  public async applyEmoji(options: EmojiApplyOptions): Promise<ScriptActionResult> {
    this.appStore.setState({ isApplyingEmoji: true, lastError: null });
    try {
      const result = await runApplyEmoji({
        ...options,
        onProgress: (percent, msg) => {
          this.appStore.setState({ applyEmojiProgress: percent, applyEmojiProgressMessage: msg });
          options.onProgress?.(percent, msg);
        }
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'Emoji apply script returned failure.');
      }

      this.syncStatusAndCache({
        emoji_active: true,
        active_emoji_name: options.emojiName
      });
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.appStore.setState({ lastError: errMsg });
      throw err;
    } finally {
      this.appStore.setState({ isApplyingEmoji: false });
    }
  }

  public async restoreEmojiStock(): Promise<ScriptActionResult> {
    this.appStore.setState({ isRestoringEmoji: true, lastError: null });
    try {
      const result = await runRestoreEmojiStock();
      if (!result.success) {
        throw new Error(result.error || result.message || 'Restore emoji script returned failure.');
      }

      this.syncStatusAndCache({
        emoji_active: false,
        active_emoji_name: 'Stock (Google)'
      });
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.appStore.setState({ lastError: errMsg });
      throw err;
    } finally {
      this.appStore.setState({ isRestoringEmoji: false });
    }
  }

  public async applyFont(options: FontApplyOptions): Promise<ScriptActionResult> {
    this.appStore.setState({ isApplying: true, lastError: null });
    try {
      const result = await runApplyFont({
        ...options,
        onProgress: (percent, msg) => {
          this.appStore.setState({ applyProgress: percent, applyProgressMessage: msg });
          options.onProgress?.(percent, msg);
        }
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'Font apply script returned failure.');
      }

      this.syncStatusAndCache({
        active: true,
        active_font_name: options.fontName
      });
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.appStore.setState({ lastError: errMsg });
      throw err;
    } finally {
      this.appStore.setState({ isApplying: false });
    }
  }

  public async restoreStock(): Promise<ScriptActionResult> {
    this.appStore.setState({ isRestoring: true, lastError: null });
    try {
      const result = await runRestoreStock();
      if (!result.success) {
        throw new Error(result.error || result.message || 'Restore stock script returned failure.');
      }

      this.syncStatusAndCache({
        active: false,
        active_font_name: 'Roboto / Google Sans'
      });
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.appStore.setState({ lastError: errMsg });
      throw err;
    } finally {
      this.appStore.setState({ isRestoring: false });
    }
  }

  public async applyFontWithPrompt(
    options: FontApplyOptions,
    promptMeta: { title?: string; body: string }
  ): Promise<boolean> {
    return this.promptAdapter.runApply({
      title: promptMeta.title ?? 'Apply Font',
      body: promptMeta.body,
      confirmText: 'Apply Font',
      iconType: 'apply',
      onApply: async (onProgress) => {
        await this.applyFont({ ...options, onProgress });
      },
      onReboot: async () => {
        this.appStore.setState({ rebootRequired: false, pendingFont: false });
        await this.reboot('soft');
      },
      onCancelReboot: () => {
        this.appStore.setState({ rebootRequired: true, rebootType: 'soft', pendingFont: true });
        this.promptAdapter.notify('Reboot postponed. Restart anytime from the Overview tab.');
      }
    });
  }

  public async applyEmojiWithPrompt(
    options: EmojiApplyOptions,
    promptMeta: { title?: string; body: string }
  ): Promise<boolean> {
    return this.promptAdapter.runApply({
      title: promptMeta.title ?? 'Apply Emoji Font?',
      body: promptMeta.body,
      confirmText: 'Apply Emoji',
      iconType: 'apply',
      onApply: async (onProgress) => {
        await this.applyEmoji({ ...options, onProgress });
      },
      onReboot: async () => {
        this.appStore.setState({ rebootRequired: false, pendingEmoji: false });
        await this.reboot('soft');
      },
      onCancelReboot: () => {
        this.appStore.setState({ rebootRequired: true, rebootType: 'soft', pendingEmoji: true });
        this.promptAdapter.notify('Reboot postponed. Restart anytime from the Overview tab.');
      }
    });
  }

  public async restoreWithPrompt(target: 'font' | 'emoji'): Promise<void> {
    const isFont = target === 'font';
    const confirmed = await this.promptAdapter.confirm({
      title: isFont ? 'Revert to Stock' : 'Revert to Stock Emojis?',
      body: isFont
        ? 'Remove custom font overlays and restore original stock system font?'
        : 'Remove custom emoji overlays and restore standard Google system emojis? This does not alter your typeface font configuration.',
      confirmText: 'Revert',
      iconType: 'revert'
    });

    if (!confirmed) return;

    this.promptAdapter.notify(isFont ? 'Reverting to stock font...' : 'Restoring stock emojis...');
    try {
      if (isFont) {
        await this.restoreStock();
        this.appStore.setState({ rebootRequired: true, rebootType: 'full', pendingFont: false });
      } else {
        await this.restoreEmojiStock();
        this.appStore.setState({ rebootRequired: true, rebootType: 'full', pendingEmoji: false });
      }

      const rebootConfirmed = await this.promptAdapter.confirm({
        title: 'Full Reboot Required',
        body: `${isFont ? 'Stock fonts' : 'Stock emojis'} have been restored. A <strong>full device reboot</strong> is required to safely unmount system overlays and prevent bootloops.<br><br>Reboot now?`,
        confirmText: 'Full Reboot',
        cancelText: 'Later',
        iconType: 'reboot'
      });

      if (rebootConfirmed) {
        await this.fullReboot();
      } else {
        this.promptAdapter.notify('Full reboot postponed. Restart anytime from the Overview tab.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.promptAdapter.notify(isFont ? `Restore failed: ${msg}` : `Failed to restore stock emojis: ${msg}`);
    }
  }

  public async cancelPendingWithPrompt(): Promise<boolean> {
    const { pendingFont, pendingEmoji } = this.appStore.getState();
    const targetLabel = pendingFont && pendingEmoji
      ? 'font and emoji'
      : pendingEmoji
        ? 'emoji'
        : pendingFont
          ? 'font'
          : 'font and emoji';

    const confirmed = await this.promptAdapter.confirm({
      title: 'Cancel Pending Application?',
      body: `Cancel the pending ${targetLabel} changes and clear staged overlays before rebooting?`,
      confirmText: 'Cancel Pending',
      iconType: 'revert'
    });
    if (!confirmed) return false;

    const cancelFont = pendingFont || !pendingEmoji;
    const cancelEmoji = pendingEmoji || !pendingFont;

    if (cancelFont) {
      await this.restoreStock();
    }
    if (cancelEmoji) {
      await this.restoreEmojiStock();
    }

    this.appStore.setState({
      rebootRequired: false,
      pendingFont: false,
      pendingEmoji: false
    });
    this.promptAdapter.notify('Pending changes cancelled.');
    return true;
  }

  public async reboot(mode: 'soft' | 'full' = 'soft'): Promise<void> {
    this.appStore.setState({ rebootRequired: false, pendingFont: false, pendingEmoji: false });
    if (mode === 'full') {
      await runFullRebootDevice();
    } else {
      await runRebootDevice();
    }
  }

  public async fullReboot(): Promise<void> {
    await this.reboot('full');
  }

  public async checkLocalDownload(patterns: string[]): Promise<string | null> {
    return findLocalDownload(patterns);
  }
}

export const fontService = new SystemFontService();
