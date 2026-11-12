/**
 * Fontify - Backend Script Wrappers
 * Typed interfaces for get_status.sh, apply_font.sh, and restore_stock.sh.
 */

import { exec } from './shell';
import { streamFontToDevice, cleanupTempFiles } from './transfer';
import type { SystemStatus, ScriptActionResult, ApplyFontParams, ApplyEmojiParams } from './types';

const STATUS_CMD =
  'if [ -f /data/adb/modules/fontify/bin/get_status.sh ]; then sh /data/adb/modules/fontify/bin/get_status.sh; else sh /data/adb/modules/custom_font_installer/bin/get_status.sh; fi';

const RESTORE_CMD =
  'if [ -f /data/adb/modules/fontify/bin/restore_stock.sh ]; then sh /data/adb/modules/fontify/bin/restore_stock.sh; else sh /data/adb/modules/custom_font_installer/bin/restore_stock.sh; fi';

const EMOJI_RESTORE_CMD =
  'if [ -f /data/adb/modules/fontify/bin/restore_emoji.sh ]; then sh /data/adb/modules/fontify/bin/restore_emoji.sh; else sh /data/adb/modules/custom_font_installer/bin/restore_emoji.sh; fi';

/**
 * Validates that an object conforms to the SystemStatus schema.
 */
function isValidSystemStatus(obj: unknown): obj is SystemStatus {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.active === 'boolean' &&
    typeof o.active_font_name === 'string' &&
    typeof o.device === 'object' &&
    o.device !== null
  );
}

/**
 * Fetches module status directly from get_status.sh.
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  const result = await exec(STATUS_CMD, { timeoutMs: 5000 });

  if (result.errno !== 0 && !result.stdout) {
    throw new Error(`get_status.sh failed (code ${result.errno}): ${result.stderr}`);
  }

  const trimmed = result.stdout.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart < 0) {
    throw new Error('get_status.sh output did not contain valid JSON.');
  }

  const jsonString = trimmed.slice(jsonStart);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse get_status.sh JSON output: ${err}`);
  }

  if (!isValidSystemStatus(parsed)) {
    throw new Error('get_status.sh returned JSON with invalid or missing fields.');
  }

  return parsed;
}

/**
 * Applies a custom font overlay to /system and /product.
 */
export async function applyFont(params: ApplyFontParams): Promise<ScriptActionResult> {
  const configObj = {
    font_name: params.fontName,
    is_variable: params.isVariable,
    weight_mode: params.weightMode,
    axes: params.axisValues,
    applied_at: Date.now()
  };

  const configJson = JSON.stringify(configObj);

  // 1. Stream payload in 128KB chunks to /data/local/tmp with verification
  const { ttfPath, configPath } = await streamFontToDevice(
    params.fontBuffer,
    params.fontFile,
    configJson,
    params.onProgress,
    params.signal
  );

  try {
    // 2. Execute apply_font.sh
    const applyCmd = `if [ -f /data/adb/modules/fontify/bin/apply_font.sh ]; then sh /data/adb/modules/fontify/bin/apply_font.sh ${ttfPath} ${configPath}; else sh /data/adb/modules/custom_font_installer/bin/apply_font.sh ${ttfPath} ${configPath}; fi`;
    const res = await exec(applyCmd, { timeoutMs: 30000 });

    if (res.errno !== 0 && !res.stdout) {
      throw new Error(`apply_font.sh failed (code ${res.errno}): ${res.stderr}`);
    }

    const trimmed = res.stdout.trim();
    let actionResult: ScriptActionResult = { success: true };

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.success === 'boolean') {
        actionResult = parsed as ScriptActionResult;
      }
    } catch (_) {
      // Non-JSON output fallback
      actionResult = {
        success: res.errno === 0,
        message: trimmed || 'Font applied successfully.'
      };
    }

    return actionResult;
  } finally {
    // 3. Guarantee temporary file removal in /data/local/tmp
    await cleanupTempFiles();
  }
}

/**
 * Applies a custom emoji font overlay to /system/fonts/NotoColorEmoji.ttf.
 */
export async function applyEmoji(params: ApplyEmojiParams): Promise<ScriptActionResult> {
  const configObj = {
    emoji_name: params.emojiName,
    source: params.emojiSource,
    applied_at: Date.now()
  };

  const configJson = JSON.stringify(configObj);

  // 1. Stream emoji payload in chunks to /data/local/tmp with verification (directUrl fast-path enabled)
  const { ttfPath, configPath } = await streamFontToDevice(
    params.emojiBuffer,
    params.emojiFile,
    configJson,
    params.onProgress,
    params.signal,
    params.emojiUrl
  );

  try {
    // 2. Execute apply_emoji.sh with POSIX sh wrapper
    const applyCmd = `if [ -f /data/adb/modules/fontify/bin/apply_emoji.sh ]; then sh /data/adb/modules/fontify/bin/apply_emoji.sh ${ttfPath} ${configPath}; else sh /data/adb/modules/custom_font_installer/bin/apply_emoji.sh ${ttfPath} ${configPath}; fi`;
    const res = await exec(applyCmd, { timeoutMs: 35000 });

    if (res.errno !== 0 && !res.stdout) {
      throw new Error(`apply_emoji.sh failed (code ${res.errno}): ${res.stderr}`);
    }

    const trimmed = res.stdout.trim();
    let actionResult: ScriptActionResult = { success: true };

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.success === 'boolean') {
        actionResult = parsed as ScriptActionResult;
      }
    } catch (_) {
      actionResult = {
        success: res.errno === 0,
        message: trimmed || 'Emoji applied successfully.'
      };
    }

    return actionResult;
  } finally {
    // 3. Guarantee temporary file removal in /data/local/tmp
    await cleanupTempFiles();
  }
}

/**
 * Reverts custom emoji overlays and restores stock system emojis.
 */
export async function restoreEmojiStock(): Promise<ScriptActionResult> {
  const res = await exec(EMOJI_RESTORE_CMD, { timeoutMs: 15000 });

  if (res.errno !== 0 && !res.stdout) {
    throw new Error(`restore_emoji.sh failed (code ${res.errno}): ${res.stderr}`);
  }

  const trimmed = res.stdout.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.success === 'boolean') {
      return parsed as ScriptActionResult;
    }
  } catch (_) {}

  return {
    success: res.errno === 0,
    message: trimmed || 'Stock emojis restored.'
  };
}

/**
 * Reverts custom font overlays and restores stock system fonts.
 */
export async function restoreStock(): Promise<ScriptActionResult> {
  const res = await exec(RESTORE_CMD, { timeoutMs: 15000 });

  if (res.errno !== 0 && !res.stdout) {
    throw new Error(`restore_stock.sh failed (code ${res.errno}): ${res.stderr}`);
  }

  const trimmed = res.stdout.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.success === 'boolean') {
      return parsed as ScriptActionResult;
    }
  } catch (_) {}

  return {
    success: res.errno === 0,
    message: trimmed || 'Stock font restored.'
  };
}

/**
 * Triggers a device soft reboot by killing system_server.
 * Matches the official Fontify v1.0.0 implementation on GitHub (https://github.com/Lavax88/Fontify):
 * restarts Zygote and the Android framework to reload all fonts & emojis without a full reboot.
 */
export async function rebootDevice(): Promise<void> {
  await exec('pkill -f system_server || killall system_server');
}
