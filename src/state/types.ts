/**
 * Fontify - State Types
 */

import type { FontInfo } from '../font/types';
import type { DeviceInfo, SystemStatus } from '../bridge/types';

export interface AppState {
  currentTab: 'overview' | 'customize';

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

  // Action status
  isApplying: boolean;
  isRestoring: boolean;
  applyProgress: number;
  applyProgressMessage: string;
  lastError: string | null;
}

export interface CachedData {
  schemaVersion: number;
  isActive: boolean;
  activeFontName: string;
  device?: DeviceInfo;
  timestamp: number;
}
