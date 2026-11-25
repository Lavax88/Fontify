/**
 * Fontify - Backend Script Wrappers
 * Typed interfaces for get_status.sh, apply_font.sh, and restore_stock.sh.
 */

import { exec } from './shell';
import { streamFontToDevice, cleanupTempFiles } from './transfer';
import type { SystemStatus, ScriptActionResult, ApplyFontParams, ApplyEmojiParams, ExecResult } from './types';

function moduleScriptCmd(scriptName: string, args = ''): string {
  const suffix = args ? ` ${args}` : '';
  return `if [ -f /data/adb/modules/fontify/bin/${scriptName} ]; then sh /data/adb/modules/fontify/bin/${scriptName}${suffix}; else sh /data/adb/modules/custom_font_installer/bin/${scriptName}${suffix}; fi`;
}

function parseScriptResult(res: ExecResult, scriptName: string, fallbackSuccessMsg: string): ScriptActionResult {
  if (res.errno !== 0 && !res.stdout) {
    throw new Error(`${scriptName} failed (code ${res.errno}): ${res.stderr}`);
  }

  const trimmed = res.stdout.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.success === 'boolean') {
      return parsed as ScriptActionResult;
    }
  } catch (_) {}

  return {
    success: res.errno === 0,
    message: trimmed || fallbackSuccessMsg
  };
}

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
  const result = await exec(moduleScriptCmd('get_status.sh'), { timeoutMs: 5000 });

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
  const configJson = JSON.stringify({
    font_name: params.fontName,
    is_variable: params.isVariable,
    weight_mode: params.weightMode,
    axes: params.axisValues,
    applied_at: Date.now()
  });

  const { ttfPath, configPath } = await streamFontToDevice(
    params.fontBuffer,
    params.fontFile,
    configJson,
    params.onProgress,
    params.signal
  );

  try {
    const res = await exec(moduleScriptCmd('apply_font.sh', `${ttfPath} ${configPath}`), { timeoutMs: 30000 });
    return parseScriptResult(res, 'apply_font.sh', 'Font applied successfully.');
  } finally {
    await cleanupTempFiles();
  }
}

/**
 * Applies a custom emoji font overlay to /system/fonts/NotoColorEmoji.ttf.
 */
export async function applyEmoji(params: ApplyEmojiParams): Promise<ScriptActionResult> {
  const configJson = JSON.stringify({
    emoji_name: params.emojiName,
    source: params.emojiSource,
    applied_at: Date.now()
  });

  const { ttfPath, configPath } = await streamFontToDevice(
    params.emojiBuffer,
    params.emojiFile,
    configJson,
    params.onProgress,
    params.signal,
    params.emojiUrl,
    params.localFilePath
  );

  try {
    const res = await exec(moduleScriptCmd('apply_emoji.sh', `${ttfPath} ${configPath}`), { timeoutMs: 35000 });
    return parseScriptResult(res, 'apply_emoji.sh', 'Emoji applied successfully.');
  } finally {
    await cleanupTempFiles();
  }
}

/**
 * Reverts custom emoji overlays and restores stock system emojis.
 */
export async function restoreEmojiStock(): Promise<ScriptActionResult> {
  const res = await exec(moduleScriptCmd('restore_emoji.sh'), { timeoutMs: 15000 });
  return parseScriptResult(res, 'restore_emoji.sh', 'Stock emojis restored.');
}

/**
 * Reverts custom font overlays and restores stock system fonts.
 */
export async function restoreStock(): Promise<ScriptActionResult> {
  const res = await exec(moduleScriptCmd('restore_stock.sh'), { timeoutMs: 15000 });
  return parseScriptResult(res, 'restore_stock.sh', 'Stock font restored.');
}

/**
 * Triggers a real Android system reboot to reload kernel VFS module overlays and font caches.
 */
export async function fullRebootDevice(): Promise<void> {
  await exec('/system/bin/svc power reboot || /system/bin/setprop sys.powerctl reboot || /system/bin/reboot || reboot');
}

/**
 * Triggers a device soft reboot to reload all fonts & emojis in ~3 seconds, or full reboot if specified.
 */
export async function rebootDevice(mode: 'soft' | 'full' = 'soft'): Promise<void> {
  if (mode === 'full') {
    await fullRebootDevice();
    return;
  }

  const deployScript = `
    if [ -f /data/adb/modules/fontify/bin/deploy_pending.sh ]; then
      sh /data/adb/modules/fontify/bin/deploy_pending.sh 2>/dev/null
    elif [ -f /data/adb/modules/custom_font_installer/bin/deploy_pending.sh ]; then
      sh /data/adb/modules/custom_font_installer/bin/deploy_pending.sh 2>/dev/null
    fi
  `.trim();

  await exec(`${deployScript} && { pkill -f system_server || killall system_server; }`);
}

/**
 * Automatically inspects local phone storage (/sdcard/Download) for sideloaded fonts or emojis.
 */
export async function findLocalDownload(patterns: string[]): Promise<string | null> {
  if (!patterns || patterns.length === 0) return null;
  const searchCandidates = patterns.map(p => `/sdcard/Download/${p} /sdcard/Download/*/${p}`).join(' ');
  const cmd = `for f in ${searchCandidates}; do
    if [ -f "$f" ]; then
      sz=$(wc -c < "$f" 2>/dev/null || echo 0)
      if [ "$sz" -gt 1000000 ]; then
        echo "$f"
        exit 0
      fi
    fi
  done; exit 1`;

  try {
    const res = await exec(cmd, { timeoutMs: 2500 });
    const path = res.stdout.trim().split('\n')[0];
    if (res.errno === 0 && path && path.startsWith('/sdcard/')) {
      return path;
    }
  } catch (_) {}
  return null;
}
