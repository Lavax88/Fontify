import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Shell Scripts Architecture & Safety Contracts', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('lib_overlay.sh centralizes overlay generation, Clock/Flag preservation, SELinux, and cache clearing', () => {
    const libPath = path.join(rootDir, 'bin', 'lib_overlay.sh');
    const content = fs.readFileSync(libPath, 'utf-8');

    expect(content).toContain('resolve_moddir()');
    expect(content).toContain('populate_font_overlay()');
    expect(content).toContain('populate_emoji_overlay()');
    expect(content).toContain('apply_overlay_permissions()');
    expect(content).toContain('clear_android_font_caches()');

    expect(content).toContain('Roboto-Regular.ttf');
    expect(content).toContain('*Clock*) continue ;;');
    expect(content).not.toContain('cp -af "$_ov_src" "$_ov_moddir/system/fonts/NotoColorEmojiFlags.ttf"');
    expect(content).toContain('rm -f "$_ov_moddir/system/fonts/NotoColorEmojiFlags.ttf"');
  });

  it('restore_emoji.sh invokes nomount_sync del_emoji to prevent dangling deleted VFS inodes', () => {
    const scriptPath = path.join(rootDir, 'bin', 'restore_emoji.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('nomount_sync.sh" del_emoji');
    expect(content).toContain('nomount_sync.sh" del_all');
  });

  it('restore_stock.sh invokes nomount_sync del_fonts and del_all', () => {
    const scriptPath = path.join(rootDir, 'bin', 'restore_stock.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('nomount_sync.sh" del_fonts');
    expect(content).toContain('nomount_sync.sh" del_all');
  });

  it('apply_emoji.sh preserves system NotoColorEmojiFlags.ttf, avoids live cache deletion, and stages when booted', () => {
    const scriptPath = path.join(rootDir, 'bin', 'apply_emoji.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('populate_emoji_overlay');
    expect(content).not.toContain('rm -rf /data/fonts/files/*');
    expect(content).toContain('.staged_emoji_pending');
    expect(content).toContain('sys.boot_completed');
  });

  it('apply_font.sh avoids live cache clearing, preserves emoji flags, and prevents in-place mutation while booted', () => {
    const scriptPath = path.join(rootDir, 'bin', 'apply_font.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('populate_font_overlay');
    expect(content).not.toContain('rm -rf /data/fonts/files/*');
    expect(content).toContain('.staged_font_pending');
    expect(content).toContain('sys.boot_completed');
  });

  it('customize.sh prevents backing up custom fonts as stock and disables unsafe hot-install', () => {
    const scriptPath = path.join(rootDir, 'customize.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('Custom font is active; skipping backup creation to preserve stock integrity');
    expect(content).toContain('Detected corrupted backup containing custom font');
    expect(content).not.toContain('MODULE_HOT_INSTALL_REQUEST=true');
  });

  it('post-fs-data.sh cleans NoMount rules in stock mode, handles pending staged fonts, and delegates to lib_overlay.sh', () => {
    const scriptPath = path.join(rootDir, 'post-fs-data.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('nomount_sync.sh" del_all');
    expect(content).toContain('nomount_sync.sh" sync');
    expect(content).toContain('.staged_font_pending');
    expect(content).toContain('.staged_emoji_pending');
  });

  it('nomount_sync.sh utilizes module unload and load with clean del_all and del_emoji actions', () => {
    const scriptPath = path.join(rootDir, 'bin', 'nomount_sync.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('module unload "$MODDIR"');
    expect(content).toContain('module load "$MODDIR"');
    expect(content).toContain('del_emoji)');
    expect(content).toContain('del_all)');
  });

  it('deploy_pending.sh populates overlays via lib_overlay.sh and syncs nomount before soft reboot', () => {
    const scriptPath = path.join(rootDir, 'bin', 'deploy_pending.sh');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('lib_overlay.sh');
    expect(content).toContain('populate_font_overlay');
    expect(content).toContain('populate_emoji_overlay');
    expect(content).toContain('nomount_sync.sh" sync');
    expect(content).toContain('.full_reboot_required');
    expect(content).toContain('svc power reboot');
  });

  it('restore_stock.sh and restore_emoji.sh mark full reboot requirement to prevent bootloops', () => {
    const restoreStockContent = fs.readFileSync(path.join(rootDir, 'bin', 'restore_stock.sh'), 'utf-8');
    expect(restoreStockContent).toContain('.full_reboot_required');

    const restoreEmojiContent = fs.readFileSync(path.join(rootDir, 'bin', 'restore_emoji.sh'), 'utf-8');
    expect(restoreEmojiContent).toContain('.full_reboot_required');

    const postFsDataContent = fs.readFileSync(path.join(rootDir, 'post-fs-data.sh'), 'utf-8');
    expect(postFsDataContent).toContain('.full_reboot_required');
  });
});
