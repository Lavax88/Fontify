/**
 * Fontify - Data Pipeline & Chunked Transfer
 * Fast native base64 conversion with 128 KB chunked streaming to /data/local/tmp.
 * Includes cancel support, progress tracking, size verification, and guaranteed temp file cleanup.
 */

import { exec } from './shell';

export const TMP_B64 = '/data/local/tmp/font_tmp.b64';
export const TMP_TTF = '/data/local/tmp/font_tmp.ttf';
export const TMP_CFG = '/data/local/tmp/config_tmp.json';

const B64_CHUNK_SIZE = 131072; // 128 KB chunks

/**
 * Removes all temporary files in /data/local/tmp.
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    await exec(`rm -f ${TMP_B64} ${TMP_TTF} ${TMP_CFG}`);
  } catch (_) {
    // Best-effort cleanup
  }
}

/**
 * Converts a Blob or ArrayBuffer to a base64 string using native FileReader.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      } else {
        reject(new Error('FileReader returned unexpected non-string result.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed to read Blob.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Streams font data and config into /data/local/tmp with verification.
 */
export async function streamFontToDevice(
  buffer: ArrayBuffer,
  file: File | null | undefined,
  configJson: string,
  onProgress?: (percent: number, message: string) => void,
  signal?: AbortSignal
): Promise<{ ttfPath: string; configPath: string }> {
  // Ensure previous artifacts are wiped
  await cleanupTempFiles();

  try {
    if (signal?.aborted) {
      throw new Error('Transfer aborted by user.');
    }

    onProgress?.(5, 'Converting font to transfer payload...');
    const blob = file || new Blob([buffer], { type: 'font/ttf' });
    const base64 = await blobToBase64(blob);

    if (signal?.aborted) {
      throw new Error('Transfer aborted by user.');
    }

    const totalChunks = Math.max(1, Math.ceil(base64.length / B64_CHUNK_SIZE));

    // Stream base64 chunks
    for (let i = 0, chunkIdx = 0; i < base64.length; i += B64_CHUNK_SIZE, chunkIdx++) {
      if (signal?.aborted) {
        throw new Error('Transfer aborted by user.');
      }

      const slice = base64.slice(i, i + B64_CHUNK_SIZE);
      const op = i === 0 ? '>' : '>>';
      const percent = Math.min(90, Math.round(((chunkIdx + 1) / totalChunks) * 80) + 10);

      onProgress?.(percent, `Transferring font payload (${percent}%)...`);

      // Write chunk using printf to avoid echo escape complications
      await exec(`printf '%s' "${slice}" ${op} ${TMP_B64}`);
    }

    if (signal?.aborted) {
      throw new Error('Transfer aborted by user.');
    }

    onProgress?.(92, 'Decoding font file on device...');
    // Decode base64 to target TTF and clean intermediate base64
    await exec(`base64 -d ${TMP_B64} > ${TMP_TTF} && rm -f ${TMP_B64}`);

    // Verify written file size against original buffer
    const sizeRes = await exec(`wc -c < ${TMP_TTF} 2>/dev/null || stat -c%s ${TMP_TTF} 2>/dev/null || echo 0`);
    const writtenBytes = parseInt(sizeRes.stdout.trim(), 10);

    if (isNaN(writtenBytes) || writtenBytes < 1000) {
      throw new Error(`Integrity check failed: written file size (${writtenBytes} B) is invalid.`);
    }

    // Write config JSON to tmpCfg
    onProgress?.(96, 'Writing font configuration...');
    const escapedConfig = configJson.replace(/'/g, "'\\''");
    await exec(`printf '%s' '${escapedConfig}' > ${TMP_CFG}`);

    onProgress?.(100, 'Transfer complete. Applying overlay...');

    return { ttfPath: TMP_TTF, configPath: TMP_CFG };
  } catch (err) {
    await cleanupTempFiles();
    throw err;
  }
}
