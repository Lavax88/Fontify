import { describe, it, expect, beforeEach } from 'vitest';
import { SystemFontService } from '../src/bridge/service';
import { Store } from '../src/state/store';
import { setMockFailure } from '../src/bridge/mock';

describe('SystemFontService (Deep Module)', () => {
  let testStore: Store;
  let service: SystemFontService;

  beforeEach(() => {
    testStore = new Store();
    service = new SystemFontService(testStore);
    setMockFailure(false);
  });

  it('refreshStatus() fetches status and updates store state', async () => {
    const status = await service.refreshStatus();
    expect(status).toBeDefined();
    expect(status.device.model).toBe('POCO F7');
    expect(testStore.getState().status.device.model).toBe('POCO F7');
    expect(testStore.getState().statusLoading).toBe(false);
    expect(testStore.getState().statusError).toBeNull();
  });

  it('applyFont() streams payload, updates store and cache upon success', async () => {
    const syntheticBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]).buffer;
    let reportedProgress = 0;

    const result = await service.applyFont({
      fontBuffer: syntheticBuffer,
      fontName: 'Inter Variable',
      isVariable: true,
      weightMode: 'custom',
      axisValues: { wght: 500 },
      onProgress: (pct) => {
        reportedProgress = pct;
      }
    });

    expect(result.success).toBe(true);
    expect(reportedProgress).toBe(100);
    expect(testStore.getState().isApplying).toBe(false);
    expect(testStore.getState().status.active).toBe(true);
    expect(testStore.getState().status.active_font_name).toBe('Inter Variable');
  });

  it('restoreStock() cleans custom overlay and reverts store state to stock', async () => {
    // Stage active state first
    testStore.setState({
      status: {
        ...testStore.getState().status,
        active: true,
        active_font_name: 'Custom Applied Font'
      }
    });

    const result = await service.restoreStock();
    expect(result.success).toBe(true);
    expect(testStore.getState().isRestoring).toBe(false);
    expect(testStore.getState().status.active).toBe(false);
    expect(testStore.getState().status.active_font_name).toBe('Roboto / Google Sans');
  });

  it('handles bridge failure gracefully and sets lastError in store', async () => {
    setMockFailure(true);

    await expect(service.refreshStatus()).rejects.toThrow();
    expect(testStore.getState().statusLoading).toBe(false);
    expect(testStore.getState().statusError).toBeDefined();

    setMockFailure(false);
  });
});
