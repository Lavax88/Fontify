import { describe, it, expect } from 'vitest';
import { quoteArg } from '../src/bridge/shell';
import { mockExec, setMockFailure } from '../src/bridge/mock';

describe('Shell Bridge & Quoting', () => {
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
});
