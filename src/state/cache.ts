/**
 * Fontify - Versioned LocalStorage Cache
 * Used strictly for immediate first-paint acceleration (<16ms).
 * Disk state remains the single source of truth.
 */

import type { CachedData } from './types';
import type { DeviceInfo, SystemStatus } from '../bridge/types';

const SCHEMA_VERSION = 1;
const CACHE_KEY = 'fontify_cache_v1';

export function getDefaultDeviceInfo(): DeviceInfo {
  return {
    model: 'POCO F7',
    device: 'onyx',
    abi: 'arm64-v8a (4K)',
    android_version: '16',
    sdk_version: '36',
    rom: 'LineageOS'
  };
}

export function getDefaultSystemStatus(): SystemStatus {
  return {
    active: false,
    active_font_name: 'Roboto / Google Sans',
    backup_exists: false,
    config: {},
    backup_info: {},
    device: getDefaultDeviceInfo()
  };
}

/**
 * Loads cached state with version validation and error isolation.
 */
export function loadCachedData(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && data.schemaVersion === SCHEMA_VERSION) {
        return data as CachedData;
      }
      // Schema mismatch or outdated version -> discard
      localStorage.removeItem(CACHE_KEY);
    }

    // Graceful migration from unversioned legacy keys
    const legacyActive = localStorage.getItem('fontify_is_active');
    const legacyFont = localStorage.getItem('fontify_active_font');
    if (legacyActive !== null || legacyFont !== null) {
      return {
        schemaVersion: SCHEMA_VERSION,
        isActive: legacyActive === 'true',
        activeFontName: legacyFont || 'Roboto / Google Sans',
        device: getDefaultDeviceInfo(),
        timestamp: Date.now()
      };
    }
  } catch (_) {
    // Storage access may throw in restricted WebViews or private browsing
  }
  return null;
}

/**
 * Saves status metadata into the cache.
 */
export function saveCachedStatus(isActive: boolean, activeFontName: string, device?: DeviceInfo): void {
  try {
    const data: CachedData = {
      schemaVersion: SCHEMA_VERSION,
      isActive,
      activeFontName,
      device,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));

    // Also update legacy keys for backward compatibility
    localStorage.setItem('fontify_is_active', isActive ? 'true' : 'false');
    localStorage.setItem('fontify_active_font', activeFontName);
  } catch (_) {
    // Storage quota or permissions error ignored
  }
}

/**
 * Initializes the initial system status from the cache or defaults.
 */
export function getInitialSystemStatus(): SystemStatus {
  const cached = loadCachedData();
  const def = getDefaultSystemStatus();

  if (cached) {
    return {
      active: cached.isActive,
      active_font_name: cached.activeFontName,
      backup_exists: false,
      config: {},
      backup_info: {},
      device: cached.device || def.device
    };
  }

  return def;
}
