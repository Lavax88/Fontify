/**
 * Fontify - State Types
 */

import type { FontInfo } from '../font/types';
import type { DeviceInfo, SystemStatus } from '../bridge/types';

export interface AppState {
  currentTab: 'overview' | 'customize' | 'emoji';

  // System status from disk
  status: SystemStatus;
  statusLoading: boolean;
  statusError: string | null;

  // Selected custom font for customization
  fontFile: File | null;
  fontBuffer: ArrayBuffer | null;
  fontData: FontInfo | null;
  axisValues: Record<string, number>;
  selectedPreset: string;
  weightMode: string;

  // Font action status
  isApplying: boolean;
  isRestoring: boolean;
  applyProgress: number;
  applyProgressMessage: string;
  lastError: string | null;

  // Selected custom or preset emoji
  emojiFile: File | null;
  emojiBuffer: ArrayBuffer | null;
  emojiName: string;
  emojiSource: 'custom' | 'preset' | null;
  emojiUrl: string | null;
  selectedEmojiPreset: string | null;
  isDownloadingEmoji: boolean;
  downloadEmojiProgress: number;
  downloadEmojiMessage: string;

  // Emoji action status
  isApplyingEmoji: boolean;
  isRestoringEmoji: boolean;
  applyEmojiProgress: number;
  applyEmojiProgressMessage: string;

  // System restart reminder
  rebootRequired: boolean;
}

export interface CachedData {
  schemaVersion: number;
  isActive: boolean;
  activeFontName: string;
  isEmojiActive?: boolean;
  activeEmojiName?: string;
  device?: DeviceInfo;
  timestamp: number;
}
