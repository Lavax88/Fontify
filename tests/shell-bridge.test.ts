import { describe, it, expect, vi, afterEach } from 'vitest';
import { quoteArg, exec, setShellTransport, setWindowDecor } from '../src/bridge/shell';
import { mockExec, setMockFailure } from '../src/bridge/mock';

describe('Shell Bridge & Quoting', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    setShellTransport(null);
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });
  it('correctly quotes arguments containing spaces and quotes', () => {
    expect(quoteArg('simple')).toBe("'simple'");
    expect(quoteArg('Roboto Flex')).toBe("'Roboto Flex'");
    expect(quoteArg("''")).toBe("''\\'''\\'''");
  });

  it('mockExec returns valid JSON status in dev mode', async () => {
    const res = await mockExec('/data/adb/modules/fontify/bin/get_status.sh');
    expect(res.errno).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(typeof parsed.active).toBe('boolean');
    expect(parsed.device).toBeDefined();
    expect(parsed.device.model).toBe('POCO F7');
  });

  it('mockExec simulates root failure when configured', async () => {
    setMockFailure(true);
    const res = await mockExec('ls /');
    expect(res.errno).toBe(1);
    expect(res.stderr).toContain('Simulated dev mock failure');
    setMockFailure(false);
  });

  it('rebootDevice deploys pending overlays and triggers fast soft reboot via system_server restart', async () => {
    const { rebootDevice } = await import('../src/bridge/scripts');
    const shell = await import('../src/bridge/shell');
    let executedCmd = '';
    vi.spyOn(shell, 'exec').mockImplementation(async (cmd) => {
      executedCmd = cmd;
      return { errno: 0, stdout: '', stderr: '' };
    });

    await rebootDevice();
    expect(executedCmd).toContain('deploy_pending.sh');
    expect(executedCmd).toContain('pkill -f system_server || killall system_server');
  });

  it('fullRebootDevice and rebootDevice("full") execute hardware power reboot', async () => {
    const { rebootDevice, fullRebootDevice } = await import('../src/bridge/scripts');
    const shell = await import('../src/bridge/shell');
    let executedCmd = '';
    vi.spyOn(shell, 'exec').mockImplementation(async (cmd) => {
      executedCmd = cmd;
      return { errno: 0, stdout: '', stderr: '' };
    });

    await fullRebootDevice();
    expect(executedCmd).toContain('svc power reboot');
    expect(executedCmd).not.toContain('pkill -f system_server');

    executedCmd = '';
    await rebootDevice('full');
    expect(executedCmd).toContain('svc power reboot');
    expect(executedCmd).not.toContain('pkill -f system_server');
  });

  it('routes exec() through an injected ShellTransport adapter and setWindowDecor through host bridge', async () => {
    const seen: string[] = [];
    setShellTransport(async (cmd) => {
      seen.push(cmd);
      return { errno: 0, stdout: 'adapter-ok', stderr: '' };
    });

    const res = await exec('echo hello');
    expect(res.stdout).toBe('adapter-ok');
    expect(seen).toEqual(['echo hello']);

    const setLightStatusBars = vi.fn();
    const setWindowDecorHost = vi.fn();
    globalThis.window = {
      $fontify: { setLightStatusBars },
      ksu: { exec: vi.fn(), setWindowDecor: setWindowDecorHost }
    } as any;

    setWindowDecor('#11140e', false);
    expect(setLightStatusBars).toHaveBeenCalledWith(false);
    expect(setWindowDecorHost).toHaveBeenCalledWith('#11140e', false);
  });
});
