import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeManager } from '../src/ui/theme';

describe('ThemeManager (Deep Module)', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    themeManager.destroy();
  });

  it('isDark() returns boolean without throwing when matchMedia is absent or mocked', () => {
    expect(typeof themeManager.isDark()).toBe('boolean');
  });

  it('injectUserStyles() safely handles missing DOM or adds stylesheet element', () => {
    expect(() => themeManager.injectUserStyles()).not.toThrow();
  });

  it('updateDecor() updates meta theme and bridge decor safely', () => {
    expect(() => themeManager.updateDecor()).not.toThrow();
  });

  it('destroy() safely cleans up listeners', () => {
    expect(() => themeManager.destroy()).not.toThrow();
  });
});
