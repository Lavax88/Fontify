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
    let isEmojiActive = false;
    let activeEmojiName = 'Stock (Google)';

    try {
      isActive = localStorage.getItem('fontify_is_active') === 'true';
      activeFontName = localStorage.getItem('fontify_active_font') || activeFontName;
      isEmojiActive = localStorage.getItem('fontify_is_emoji_active') === 'true';
      activeEmojiName = localStorage.getItem('fontify_active_emoji') || activeEmojiName;
    } catch (_) {}

    return {
      errno: 0,
      stdout: JSON.stringify({
        active: isActive,
        active_font_name: activeFontName,
        emoji_active: isEmojiActive,
        active_emoji_name: activeEmojiName,
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

  // Handle apply_emoji.sh
  if (command.includes('apply_emoji.sh')) {
    return {
      errno: 0,
      stdout: JSON.stringify({
        success: true,
        message: 'Emoji font applied successfully! Please reboot your device to load new emojis.'
      }),
      stderr: ''
    };
  }

  // Handle restore_emoji.sh
  if (command.includes('restore_emoji.sh')) {
    return {
      errno: 0,
      stdout: JSON.stringify({
        success: true,
        message: 'Custom emoji removed and stock emoji restored. Please reboot to apply.'
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

  // Handle reboot & soft reboot
  if (command.includes('reboot') || command.includes('system_server') || command.includes('pkill')) {
    return {
      errno: 0,
      stdout: 'Reboot simulated in desktop browser',
      stderr: ''
    };
  }

  // Handle file size checks (e.g. wc -c or stat)
  if (command.includes('wc -c') || command.includes('stat -c%s')) {
    return {
      errno: 0,
      stdout: '100000\n',
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
