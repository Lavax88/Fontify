/**
 * Fontify - Bridge Types
 */

export interface ExecResult {
  errno: number;
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  timeoutMs?: number;
  cwd?: string;
}

export interface DeviceInfo {
  model: string;
  device: string;
  abi: string;
  android_version: string;
  sdk_version: string;
  rom: string;
}

export interface SystemStatus {
  active: boolean;
  active_font_name: string;
  emoji_active?: boolean;
  active_emoji_name?: string;
  backup_exists: boolean;
  config: Record<string, unknown>;
  emoji_config?: Record<string, unknown>;
  backup_info: Record<string, unknown>;
  device: DeviceInfo;
}

export interface ScriptActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApplyFontParams {
  fontBuffer: ArrayBuffer;
  fontFile?: File | null;
  fontName: string;
  isVariable: boolean;
  weightMode: string;
  axisValues: Record<string, number>;
  onProgress?: (percent: number, message: string) => void;
  signal?: AbortSignal;
}

export interface ApplyEmojiParams {
  emojiBuffer: ArrayBuffer;
  emojiFile?: File | null;
  emojiName: string;
  emojiSource: 'custom' | 'preset';
  emojiUrl?: string;
  onProgress?: (percent: number, message: string) => void;
  signal?: AbortSignal;
}
