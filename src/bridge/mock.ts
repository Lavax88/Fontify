/**
 * Fontify - Dev Root Bridge Mock
 * Included in development builds only (tree-shaken out of production bundles).
 */

import type { ExecResult } from './types';

let mockSlowDown = false;
let mockFailure = false;

export function setMockSlowDown(enable: boolean): void {
  mockSlowDown = enable;
}

export function setMockFailure(enable: boolean): void {
  mockFailure = enable;
}

export async function mockExec(command: string): Promise<ExecResult> {
  const delay = mockSlowDown ? 1500 : 100;
  await new Promise(resolve => setTimeout(resolve, delay));

  if (mockFailure) {
    return {
      errno: 1,
      stdout: '',
      stderr: 'Simulated dev mock failure: root execution denied'
    };
  }

  // Handle get_status.sh
  if (command.includes('get_status.sh')) {
    let isActive = false;
    let activeFontName = 'Roboto / Google Sans';

    try {
      isActive = localStorage.getItem('fontify_is_active') === 'true';
      activeFontName = localStorage.getItem('fontify_active_font') || activeFontName;
    } catch (_) {}

    return {
      errno: 0,
      stdout: JSON.stringify({
        active: isActive,
        active_font_name: activeFontName,
        backup_exists: true,
        config: {},
        backup_info: { backed_up: true },
        device: {
          model: 'POCO F7',
          device: 'onyx',
          abi: 'arm64-v8a (4K)',
          android_version: '16',
          sdk_version: '36',
          rom: 'LineageOS 23.2'
        }
      }),
      stderr: ''
    };
  }

  // Handle apply_font.sh
  if (command.includes('apply_font.sh')) {
    return {
      errno: 0,
      stdout: JSON.stringify({
        success: true,
        message: 'Font applied successfully! Please reboot your device to load new fonts.'
      }),
      stderr: ''
    };
  }

  // Handle restore_stock.sh
  if (command.includes('restore_stock.sh')) {
    return {
      errno: 0,
      stdout: JSON.stringify({
        success: true,
        message: 'Custom font removed and stock font restored. Please reboot to apply.'
      }),
      stderr: ''
    };
  }

  // Handle reboot
  if (command.includes('reboot')) {
    return {
      errno: 0,
      stdout: 'Reboot simulated in desktop browser',
      stderr: ''
    };
  }

  // Default mock success (e.g. file commands, printf, base64)
  return {
    errno: 0,
    stdout: '',
    stderr: ''
  };
}
