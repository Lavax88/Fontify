/**
 * Fontify - Deep System Font Management Service
 * Consolidates status inspection, chunked font streaming, script execution,
 * state & cache persistence, and reboot into a single deep module.
 */

import {
  getSystemStatus,
  applyFont as runApplyFont,
  restoreStock as runRestoreStock,
  applyEmoji as runApplyEmoji,
  restoreEmojiStock as runRestoreEmojiStock,
  rebootDevice as runRebootDevice
} from './scripts';
import type { SystemStatus, ScriptActionResult } from './types';
import { store, Store } from '../state/store';
import { saveCachedStatus } from '../state/cache';

export interface FontApplyOptions {
  fontBuffer: ArrayBuffer;
  fontFile?: File | null;
  fontName: string;
  isVariable: boolean;
  weightMode: string;
  axisValues: Record<string, number>;
  onProgress?: (percent: number, message: string) => void;
  signal?: AbortSignal;
}

export interface EmojiApplyOptions {
  emojiBuffer: ArrayBuffer;
  emojiFile?: File | null;
  emojiName: string;
  emojiSource: 'custom' | 'preset';
  emojiUrl?: string;
  onProgress?: (percent: number, message: string) => void;
  signal?: AbortSignal;
}

export class SystemFontService {
  constructor(private appStore: Store = store) {}

  /**
   * Refreshes system status from host disk and updates store and cache.
   */
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

  /**
   * Applies custom emoji overlay to /system/fonts/NotoColorEmoji.ttf.
   */
  public async applyEmoji(options: EmojiApplyOptions): Promise<ScriptActionResult> {
    this.appStore.setState({ isApplyingEmoji: true, lastError: null });
    try {
      const result = await runApplyEmoji({
        emojiBuffer: options.emojiBuffer,
        emojiFile: options.emojiFile,
        emojiName: options.emojiName,
        emojiSource: options.emojiSource,
        emojiUrl: options.emojiUrl,
        onProgress: (percent, msg) => {
          this.appStore.setState({ applyEmojiProgress: percent, applyEmojiProgressMessage: msg });
          options.onProgress?.(percent, msg);
        },
        signal: options.signal
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'Emoji apply script returned failure.');
      }

      // Automatically sync cache and store upon success
      const currentStatus = this.appStore.getState().status;
      saveCachedStatus(
        currentStatus.active,
        currentStatus.active_font_name,
        currentStatus.device,
        true,
        options.emojiName
      );
      this.appStore.setState({
        status: {
          ...currentStatus,
          emoji_active: true,
          active_emoji_name: options.emojiName
        }
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

  /**
   * Reverts system emoji overlay and restores original stock system emojis.
   */
  public async restoreEmojiStock(): Promise<ScriptActionResult> {
    this.appStore.setState({ isRestoringEmoji: true, lastError: null });
    try {
      const result = await runRestoreEmojiStock();
      if (!result.success) {
        throw new Error(result.error || result.message || 'Restore emoji script returned failure.');
      }

      const currentStatus = this.appStore.getState().status;
      saveCachedStatus(
        currentStatus.active,
        currentStatus.active_font_name,
        currentStatus.device,
        false,
        'Stock (Google)'
      );
      this.appStore.setState({
        status: {
          ...currentStatus,
          emoji_active: false,
          active_emoji_name: 'Stock (Google)'
        }
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

  /**
   * Applies custom font overlay: streams payload in chunks, runs apply_font.sh,
   * cleans up temporary files, and synchronizes state and cache.
   */
  public async applyFont(options: FontApplyOptions): Promise<ScriptActionResult> {
    this.appStore.setState({ isApplying: true, lastError: null });
    try {
      const result = await runApplyFont({
        fontBuffer: options.fontBuffer,
        fontFile: options.fontFile,
        fontName: options.fontName,
        isVariable: options.isVariable,
        weightMode: options.weightMode,
        axisValues: options.axisValues,
        onProgress: (percent, msg) => {
          this.appStore.setState({ applyProgress: percent, applyProgressMessage: msg });
          options.onProgress?.(percent, msg);
        },
        signal: options.signal
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'Font apply script returned failure.');
      }

      // Automatically sync cache and store upon success
      const currentStatus = this.appStore.getState().status;
      saveCachedStatus(
        true,
        options.fontName,
        currentStatus.device,
        currentStatus.emoji_active ?? false,
        currentStatus.active_emoji_name ?? 'Stock (Google)'
      );
      this.appStore.setState({
        status: {
          ...currentStatus,
          active: true,
          active_font_name: options.fontName
        }
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

  /**
   * Reverts system to original stock fonts, cleaning overlay directories and font cache.
   */
  public async restoreStock(): Promise<ScriptActionResult> {
    this.appStore.setState({ isRestoring: true, lastError: null });
    try {
      const result = await runRestoreStock();
      if (!result.success) {
        throw new Error(result.error || result.message || 'Restore stock script returned failure.');
      }

      // Automatically sync cache and store upon success
      const currentStatus = this.appStore.getState().status;
      saveCachedStatus(false, 'Roboto / Google Sans', currentStatus.device);
      this.appStore.setState({
        status: {
          ...currentStatus,
          active: false,
          active_font_name: 'Roboto / Google Sans'
        }
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

  /**
   * Reboots the Android device.
   */
  public async reboot(): Promise<void> {
    await runRebootDevice();
  }
}

export const fontService = new SystemFontService();
