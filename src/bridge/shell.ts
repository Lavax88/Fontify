/**
 * Fontify - Universal Root Shell Bridge
 * Supports KernelSU, KernelSU Next, APatch, and MMRL interfaces.
 * Strictly encapsulates all window.ksu and window.mmrl interactions.
 */

import type { ExecResult, ExecOptions } from './types';

declare global {
  interface Window {
    ksu?: {
      exec: (
        command: string,
        arg2?: string,
        arg3?: string
      ) => Promise<unknown> | string | { errno?: number; code?: number; stdout?: string; stderr?: string } | undefined;
      setWindowDecor?: (color: string, isDark: boolean) => void;
    };
    mmrl?: {
      exec: (command: string) => Promise<string | { errno?: number; code?: number; stdout?: string; stderr?: string }>;
    };
    $fontify?: {
      setLightStatusBars?: (light: boolean) => void;
    };
    [key: string]: unknown;
  }
}

/**
 * Escapes and wraps a string in single quotes for safe shell execution.
 */
export function quoteArg(arg: string): string {
  // Replace every single quote ' with '\''
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Checks if a real root manager bridge is present in the current WebView.
 */
export function isRootManagerPresent(): boolean {
  return (
    (typeof window !== 'undefined' && typeof window.ksu !== 'undefined' && typeof window.ksu.exec === 'function') ||
    (typeof window !== 'undefined' && typeof window.mmrl !== 'undefined' && typeof window.mmrl.exec === 'function')
  );
}

/**
 * Executes a shell command with automatic timeout and error guards.
 */
export async function exec(command: string, opts: ExecOptions = {}): Promise<ExecResult> {
  const timeoutMs = opts.timeoutMs ?? 10000;

  // Use desktop dev mock if running under Vite dev server without root manager
  if (import.meta.env.DEV && !isRootManagerPresent()) {
    const { mockExec } = await import('./mock');
    return mockExec(command);
  }

  return new Promise<ExecResult>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cbName: string | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (cbName && typeof window !== 'undefined' && cbName in window) {
        delete window[cbName];
      }
    };

    const handleSuccess = (result: ExecResult) => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(result);
      }
    };

    const handleError = (error: Error) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(error);
      }
    };

    // Timeout guard
    timer = setTimeout(() => {
      handleError(new Error(`Command timed out after ${timeoutMs}ms: ${command.slice(0, 80)}`));
    }, timeoutMs);

    // 1. KernelSU / KernelSU Next / APatch WebUI Interface
    if (typeof window.ksu !== 'undefined' && typeof window.ksu.exec === 'function') {
      cbName = `_fontify_cb_${Math.random().toString(36).slice(2, 11)}`;

      window[cbName] = (errno: number, stdout: string, stderr: string) => {
        handleSuccess({
          errno: errno ?? 0,
          stdout: stdout ?? '',
          stderr: stderr ?? ''
        });
      };

      try {
        let ret: unknown;
        try {
          // Standard KernelSU 3-argument signature: ksu.exec(cmd, optionsJson, callbackName)
          ret = window.ksu.exec(command, JSON.stringify({ cwd: opts.cwd }), cbName);
        } catch (_) {
          // Fallback 2-argument signature
          ret = window.ksu.exec(command, cbName);
        }

        // Handle Promise-based return
        if (ret && typeof (ret as Promise<unknown>).then === 'function') {
          (ret as Promise<unknown>)
            .then(res => {
              if (typeof res === 'string') {
                try {
                  const parsed = JSON.parse(res);
                  if (parsed && typeof parsed === 'object' && ('stdout' in parsed || 'errno' in parsed)) {
                    handleSuccess({
                      errno: Number(parsed.errno ?? parsed.code ?? 0),
                      stdout: String(parsed.stdout ?? ''),
                      stderr: String(parsed.stderr ?? '')
                    });
                    return;
                  }
                } catch (_) {}
                handleSuccess({ errno: 0, stdout: res, stderr: '' });
              } else if (res && typeof res === 'object') {
                const obj = res as Record<string, unknown>;
                handleSuccess({
                  errno: Number(obj.errno ?? obj.code ?? 0),
                  stdout: String(obj.stdout ?? ''),
                  stderr: String(obj.stderr ?? '')
                });
              } else {
                handleSuccess({ errno: 0, stdout: String(res ?? ''), stderr: '' });
              }
            })
            .catch(err => {
              handleError(err instanceof Error ? err : new Error(String(err)));
            });
          return;
        }

        // Handle direct synchronous return
        if (ret !== undefined && ret !== null) {
          if (typeof ret === 'string') {
            try {
              const parsed = JSON.parse(ret);
              if (parsed && typeof parsed === 'object' && ('stdout' in parsed || 'errno' in parsed)) {
                handleSuccess({
                  errno: Number(parsed.errno ?? parsed.code ?? 0),
                  stdout: String(parsed.stdout ?? ''),
                  stderr: String(parsed.stderr ?? '')
                });
                return;
              }
            } catch (_) {}
            handleSuccess({ errno: 0, stdout: ret, stderr: '' });
          } else if (typeof ret === 'object') {
            const obj = ret as Record<string, unknown>;
            handleSuccess({
              errno: Number(obj.errno ?? obj.code ?? 0),
              stdout: String(obj.stdout ?? ''),
              stderr: String(obj.stderr ?? '')
            });
          }
          return;
        }

        // If returned void, the registered window[cbName] will be invoked by Java/Kotlin bridge
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
      return;
    }

    // 2. MMRL Interface
    if (typeof window.mmrl !== 'undefined' && typeof window.mmrl.exec === 'function') {
      try {
        window.mmrl
          .exec(command)
          .then(out => {
            if (typeof out === 'string') {
              handleSuccess({ errno: 0, stdout: out, stderr: '' });
            } else if (out && typeof out === 'object') {
              handleSuccess({
                errno: Number(out.errno ?? out.code ?? 0),
                stdout: String(out.stdout ?? ''),
                stderr: String(out.stderr ?? '')
              });
            } else {
              handleSuccess({ errno: 0, stdout: String(out ?? ''), stderr: '' });
            }
          })
          .catch(err => {
            handleError(err instanceof Error ? err : new Error(String(err)));
          });
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
      return;
    }

    // 3. Fallback when neither bridge is found and not in dev mode
    handleError(new Error('No root manager bridge (KernelSU/MMRL) found in this environment.'));
  });
}
