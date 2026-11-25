/**
 * Fontify - Application Bootstrap Entrypoint (M3E Expressive)
 */

import './ui/m3e';
import './styles/style.css';

import { fontService } from './bridge/service';
import { themeManager } from './ui/theme';
import { setupOverviewTab } from './ui/overview';
import { setupBrowseTab } from './ui/browse';
import { setupCustomizeTab } from './ui/customize';
import { setupEmojiTab } from './ui/emoji';
import { initNavigation } from './ui/navigation';

async function reconcileDiskStatus(): Promise<void> {
  try {
    await fontService.refreshStatus();
  } catch (err) {
    console.warn('Background status sync error:', err);
  }
}

function init(): void {
  themeManager.init();
  setupOverviewTab();
  setupBrowseTab();
  setupCustomizeTab();
  setupEmojiTab();
  initNavigation();

  reconcileDiskStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
