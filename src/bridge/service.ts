/**
 * Fontify - Deep System Font Management Service
 * Consolidates status inspection, chunked font streaming, script execution,
 * state & cache persistence, and reboot into a single deep module.
 */

import { getSystemStatus, applyFont as runApplyFont, restoreStock as runRestoreStock, rebootDevice as runRebootDevice } from './scripts';
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
      saveCachedStatus(diskStatus.active, diskStatus.active_font_name, diskStatus.device);
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
      saveCachedStatus(true, options.fontName, currentStatus.device);
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
