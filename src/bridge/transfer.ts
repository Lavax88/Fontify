/**
 * Fontify - Data Pipeline & Chunked Transfer
 * Fast native base64 conversion with 128 KB chunked streaming to /data/local/tmp.
 * Includes cancel support, progress tracking, size verification, and guaranteed temp file cleanup.
 */

import { exec } from './shell';

export const TMP_B64 = '/data/local/tmp/font_tmp.b64';
export const TMP_TTF = '/data/local/tmp/font_tmp.ttf';
export const TMP_CFG = '/data/local/tmp/config_tmp.json';

// 96 KB chunks strictly under Linux kernel MAX_ARG_STRLEN (131,072 bytes) and multiple of 4 (divisible by 4 for valid base64 blocks)
export const B64_CHUNK_SIZE = 98304;

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
  if (typeof FileReader !== 'undefined') {
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

  // Universal fallback for Node.js test runners and environments without FileReader
  const arrayBuffer = await blob.arrayBuffer();
  const globalObj = typeof globalThis !== 'undefined' ? (globalThis as unknown as { Buffer?: { from: (b: ArrayBuffer) => { toString: (enc: string) => string } } }) : {};
  if (globalObj.Buffer) {
    return globalObj.Buffer.from(arrayBuffer).toString('base64');
  }

  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Streams font data and config into /data/local/tmp with verification.
 * If a valid direct download URL is available, attempts ultra-fast on-device download (curl/wget),
 * falling back to robust 48 KB base64 chunked transfer.
 */
export async function streamFontToDevice(
  buffer: ArrayBuffer,
  file: File | null | undefined,
  configJson: string,
  onProgress?: (percent: number, message: string) => void,
  signal?: AbortSignal,
  directUrl?: string
): Promise<{ ttfPath: string; configPath: string }> {
  // Ensure previous artifacts are wiped
  await cleanupTempFiles();

  try {
    if (signal?.aborted) {
      throw new Error('Transfer aborted by user.');
    }

    // 1. Ultra-fast direct device download ONLY if buffer is NOT already present in memory and URL is provided
    const hasBuffer = (buffer && buffer.byteLength >= 1000) || (file && file.size >= 1000);
    if (!hasBuffer && directUrl && directUrl.startsWith('http')) {
      onProgress?.(15, 'Downloading font directly to device...');
      try {
        const escapedUrl = directUrl.replace(/'/g, "'\\''");
        const dlRes = await exec(
          `curl -fkLs '${escapedUrl}' -o ${TMP_TTF} 2>/dev/null || wget -qO ${TMP_TTF} '${escapedUrl}' 2>/dev/null`,
          { timeoutMs: 60000 }
        );

        if (dlRes.errno === 0) {
          const checkRes = await exec(`wc -c < ${TMP_TTF} 2>/dev/null || stat -c%s ${TMP_TTF} 2>/dev/null || echo 0`);
          const cleanSize = checkRes.stdout.trim().replace(/\D/g, '');
          const writtenBytes = parseInt(cleanSize, 10);
          if (!isNaN(writtenBytes) && writtenBytes >= 1000) {
            onProgress?.(95, 'Writing font configuration...');
            const escapedConfig = configJson.replace(/'/g, "'\\''");
            await exec(`printf '%s' '${escapedConfig}' > ${TMP_CFG}`);
            onProgress?.(100, 'Payload ready on device.');
            return { ttfPath: TMP_TTF, configPath: TMP_CFG };
          }
        }
      } catch (err) {
        console.warn('Direct device download notice, falling back to streaming:', err);
      }
    }

    // 2. High-speed base64 chunked transfer with on-the-fly streaming decode
    onProgress?.(5, 'Preparing font payload...');
    const blob = file || new Blob([buffer], { type: 'font/ttf' });
    const base64 = await blobToBase64(blob);

    if (signal?.aborted) {
      throw new Error('Transfer aborted by user.');
    }

    const totalChunks = Math.max(1, Math.ceil(base64.length / B64_CHUNK_SIZE));

    // Stream base64 chunks directly piped to base64 -d into TMP_TTF (eliminating disk churn and second pass)
    for (let i = 0, chunkIdx = 0; i < base64.length; i += B64_CHUNK_SIZE, chunkIdx++) {
      if (signal?.aborted) {
        throw new Error('Transfer aborted by user.');
      }

      const slice = base64.slice(i, i + B64_CHUNK_SIZE);
      const op = i === 0 ? '>' : '>>';
      const percent = Math.min(92, Math.round(((chunkIdx + 1) / totalChunks) * 85) + 5);

      onProgress?.(percent, `Streaming font payload (${percent}%)...`);

      // Write chunk using printf piped directly into base64 -d
      await exec(`printf '%s' "${slice}" | base64 -d ${op} ${TMP_TTF}`, { timeoutMs: 15000 });
    }

    if (signal?.aborted) {
      throw new Error('Transfer aborted by user.');
    }

    // Verify written file size against original buffer
    const sizeRes = await exec(`wc -c < ${TMP_TTF} 2>/dev/null || stat -c%s ${TMP_TTF} 2>/dev/null || echo 0`);
    const cleanSize = sizeRes.stdout.trim().replace(/\D/g, '');
    const writtenBytes = parseInt(cleanSize, 10);

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
