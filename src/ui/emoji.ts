/**
 * Fontify - Emoji Tab Controller
 * Curated Material 3 emoji card grid (iOS 26, iOS 18, Fluent, OneUI, Twitter, Google),
 * local IndexedDB binary caching, streaming downloads, dynamic @font-face preview,
 * and custom font file importing.
 */

import { store } from '../state/store';
import { fontService } from '../bridge/service';
import { FontEngine } from '../font/engine';
import { showToast } from './components/toast';
import { getCachedFontBuffer, saveCachedFont } from '../browse/fontCache';
import { streamAssetDownload } from '../browse/catalogService';
import { EMOJI_CATALOG } from '../browse/emojiCatalog';
import type { BrowseItem } from '../browse/types';

export interface EmojiPreset {
  id: string;
  name: string;
  icon?: string;
  category?: string;
  description?: string;
  author: string;
  sizeMb: string;
  url: string;
}

export interface CuratedEmojiPack {
  id: string;
  name: string;
  title: string;
  icon: string;
  description: string;
  author: string;
  sizeMb: string;
  url: string;
}

const EMOJI_PRESET_META: Record<string, { title: string; icon: string; category: string; description: string }> = {
  'ios-26': { title: 'iOS 26 (Apple)', icon: '🍎', category: 'apple', description: 'Clean Apple Unicode 17' },
  'ios': { title: 'iOS 18 (Apple)', icon: '🍎', category: 'apple', description: 'Clean Apple emoji styling' },
  'fluent': { title: 'Fluent 3D', icon: '🪟', category: 'fluent', description: 'Modern Microsoft Fluent design' },
  'samsung': { title: 'Samsung One UI', icon: '📱', category: 'samsung', description: 'Vibrant Galaxy emoji style' },
  'twemoji': { title: 'Twemoji (Twitter)', icon: '🐦', category: 'twemoji', description: 'Flat, colorful Twitter/X design' },
  'whatsapp': { title: 'WhatsApp 2.26', icon: '💬', category: 'whatsapp', description: 'WhatsApp modern emoji set' },
  'facebook': { title: 'Facebook 16.0', icon: '👥', category: 'facebook', description: 'Facebook system emojis' },
  'joypixels': { title: 'JoyPixels 10', icon: '✨', category: 'joypixels', description: 'JoyPixels color emojis' },
  'noto': { title: 'Google Noto (Stock)', icon: '🤖', category: 'noto', description: 'Standard Android system emojis' }
};

function buildPresetFromCatalog(id: string): CuratedEmojiPack & EmojiPreset {
  const entry = EMOJI_CATALOG.find(e => e.id === id);
  const meta = EMOJI_PRESET_META[id];
  if (!entry || !meta) {
    throw new Error(`Missing emoji catalog entry for preset "${id}"`);
  }
  return {
    id: entry.id,
    name: entry.name,
    title: meta.title,
    icon: meta.icon,
    category: meta.category,
    description: meta.description,
    author: entry.author,
    sizeMb: entry.sizeMb,
    url: entry.url
  };
}

// 6 Curated Emoji Packs requested by user (iOS 26, iOS 18, Fluent, OneUI, Twitter, Google)
export const CURATED_EMOJI_PACKS: CuratedEmojiPack[] = [
  'ios-26',
  'ios',
  'fluent',
  'samsung',
  'twemoji',
  'noto'
].map(buildPresetFromCatalog);

// Presets exported for backward compatibility & test verification
export const FLAGSHIP_PRESETS: EmojiPreset[] = [
  'ios-26',
  'ios',
  'samsung',
  'fluent',
  'twemoji',
  'whatsapp',
  'facebook',
  'joypixels',
  'noto'
].map(buildPresetFromCatalog);

export const EMOJI_PRESETS: EmojiPreset[] = FLAGSHIP_PRESETS;

export const EMOJI_CATEGORIES: Record<string, { label: string; icon: string; glyphs: string[] }> = {
  smileys: {
    label: 'Smileys',
    icon: '😀',
    glyphs: ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓']
  },
  gestures: {
    label: 'Gestures',
    icon: '👍',
    glyphs: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶']
  },
  animals: {
    label: 'Animals',
    icon: '🐶',
    glyphs: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈']
  },
  food: {
    label: 'Food',
    icon: '🍕',
    glyphs: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🌽', '🥕', '🥔', '🥐', '🍞', '🥖', '🥨', '🧀', '🍳', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🍝', '🍜', '🍲', '🍣', '🍱', '🍦', '🍩', '🍪', '🍫', '🍿', '☕', '🍵', '🧃', '🥤', '🍺']
  },
  objects: {
    label: 'Objects',
    icon: '💻',
    glyphs: ['💻', '🖥️', '⌨️', '🖱️', '📱', '☎️', '📺', '📻', '🎙️', '🧭', '⏰', '🔋', '🔌', '💡', '🔦', '💸', '💵', '🪙', '💰', '💳', '💎', '🧰', '🔧', '🔨', '🛠️', '⛓️', '🧲', '💣', '🛡️', '🔮', '🔭', '🔬', '💊', '💉', '🩹', '🧹', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🎁', '🎈', '🎉', '✉️', '📦', '🏷️', '📊', '📈', '📅', '📁', '📚', '📖', '🔒', '🔓']
  },
  symbols: {
    label: 'Symbols',
    icon: '❤️',
    glyphs: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '💯', '💢', '♨️', '⚠️', '☢️', '☣️', '⚜️', '🔰', '♻️', '✅', '❌', '⭕', '🛑', '⛔', '🔥', '✨', '⚡', '💥', '⭐', '🌟']
  }
};

let activeShowcaseCategory = 'smileys';

export async function applySelectedEmoji(): Promise<void> {
  const state = store.getState();
  if (!state.emojiBuffer) {
    showToast('Please select or download an emoji font first.');
    return;
  }

  await fontService.applyEmojiWithPrompt(
    {
      emojiBuffer: state.emojiBuffer,
      emojiFile: state.emojiFile,
      emojiName: state.emojiName,
      emojiSource: state.emojiSource || 'custom',
      emojiUrl: state.emojiUrl || undefined
    },
    {
      title: 'Apply Emoji Font?',
      body: `Install <strong>${state.emojiName || 'Custom Emoji'}</strong> across SystemUI and apps?<br><br>A device restart is required to reload system emojis.`
    }
  );
}

export async function restoreStockEmoji(): Promise<void> {
  await fontService.restoreWithPrompt('emoji');
}

export function setupEmojiTab(): void {
  // DOM Elements
  const emojiDropzone = document.getElementById('emoji-dropzone');
  const emojiFileInput = document.getElementById('emoji-file-input') as HTMLInputElement | null;
  const btnSelectEmojiFile = document.getElementById('btn-select-emoji-file');

  const emojiInfoRow = document.getElementById('emoji-info-row');
  const emojiNameElem = document.getElementById('emoji-font-name');
  const emojiSizeElem = document.getElementById('emoji-font-size');
  const emojiSourceBadge = document.getElementById('emoji-source-badge');

  const curatedGridContainer = document.getElementById('curated-emoji-grid');
  const downloadProgressContainer = document.getElementById('emoji-download-progress-box');
  const downloadProgressFill = document.getElementById('emoji-download-progress-fill') as (HTMLElement & { value?: number }) | null;
  const downloadProgressText = document.getElementById('emoji-download-progress-text');

  const categoryBar = document.getElementById('emoji-category-bar');
  const showcaseGrid = document.getElementById('emoji-showcase-grid');
  const specimenHero = document.getElementById('emoji-specimen-hero');

  // 1. Render Curated 2-Column Emoji Grid (<m3e-card>)
  function renderCuratedGrid(): void {
    if (!curatedGridContainer) return;
    curatedGridContainer.innerHTML = '';

    const currentSelectedId = store.getState().selectedEmojiPreset;
    const activeSystemEmoji = store.getState().status?.active_emoji_name || '';
    const emojiActive = store.getState().status?.emoji_active ?? false;

    CURATED_EMOJI_PACKS.forEach(pack => {
      let isSelected = false;
      if (currentSelectedId) {
        isSelected = currentSelectedId === pack.id;
      } else if (!store.getState().emojiBuffer) {
        if (emojiActive && activeSystemEmoji) {
          const sysLower = activeSystemEmoji.toLowerCase();
          isSelected = sysLower.includes(pack.id) ||
                       sysLower.includes(pack.title.toLowerCase()) ||
                       pack.name.toLowerCase().includes(sysLower);
        } else if (!emojiActive && pack.id === 'noto') {
          isSelected = true;
        }
      }

      const card = document.createElement('m3e-card');
      card.className = `curated-emoji-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('variant', 'filled');
      card.setAttribute('actionable', '');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-id', pack.id);
      card.setAttribute('aria-label', `${pack.title}: ${pack.description}`);

      card.innerHTML = `
        <div slot="content">
          <div class="curated-card-icon" aria-hidden="true">${pack.icon}</div>
          <div class="curated-card-title">${pack.title}</div>
        </div>
      `;

      card.addEventListener('click', async () => {
        await selectOrDownloadPreset(pack);
      });

      card.addEventListener('keydown', async (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          await selectOrDownloadPreset(pack);
        }
      });

      curatedGridContainer.appendChild(card);
    });
  }

  // 2. Select or Download Preset (0ms if cached, streaming if new)
  async function selectOrDownloadPreset(pack: CuratedEmojiPack): Promise<void> {
    if (store.getState().isDownloadingEmoji) {
      showToast('Download in progress, please wait...');
      return;
    }

    // Check if already in unified IndexedDB cache
    const cacheId = `emoji-${pack.id}`;
    const cachedBuffer = await getCachedFontBuffer(cacheId);
    if (cachedBuffer) {
      store.setState({
        emojiFile: null,
        emojiBuffer: cachedBuffer,
        emojiName: pack.name,
        emojiSource: 'preset',
        emojiUrl: pack.url,
        selectedEmojiPreset: pack.id
      });

      if (emojiSourceBadge) emojiSourceBadge.textContent = 'Cached';
      await registerEmojiPreview(cachedBuffer, pack.name);
      renderCuratedGrid();
      showToast(`Selected ${pack.title} (from cache)`);
      return;
    }

    // Fully-automatic check for local copy in /sdcard/Download
    const localPatterns = [
      `*${pack.id}*.ttf`,
      `*${pack.title.replace(/[^a-zA-Z0-9]/g, '*')}*.ttf`,
      `*${pack.name.replace(/[^a-zA-Z0-9]/g, '*')}*.ttf`
    ];
    const localPath = await fontService.checkLocalDownload(localPatterns);
    if (localPath) {
      store.setState({
        emojiFile: null,
        emojiBuffer: new ArrayBuffer(0),
        emojiName: pack.name,
        emojiSource: 'preset',
        emojiUrl: pack.url,
        selectedEmojiPreset: pack.id
      });
      if (emojiSourceBadge) emojiSourceBadge.textContent = 'Local';
      renderCuratedGrid();
      showToast(`Selected ${pack.title} (from local Downloads)`);
      return;
    }

    // Stream download with progress
    store.setState({
      isDownloadingEmoji: true,
      downloadEmojiProgress: 0,
      downloadEmojiMessage: `Connecting to ${pack.title}...`,
      selectedEmojiPreset: pack.id
    });

    renderCuratedGrid();

    if (downloadProgressContainer) downloadProgressContainer.style.display = 'block';
    if (downloadProgressText) downloadProgressText.textContent = `Connecting to ${pack.title}...`;

    try {
      const combinedBuffer = await streamAssetDownload(pack.url, pack.title, (percent, msg) => {
        if (downloadProgressFill) {
          downloadProgressFill.value = percent;
          downloadProgressFill.setAttribute('value', String(percent));
        }
        if (downloadProgressText) {
          downloadProgressText.textContent = msg;
        }
      });

      // Save to unified IndexedDB cache
      const cacheItem: BrowseItem = {
        id: cacheId,
        name: pack.name,
        type: 'emoji',
        source: 'zfont',
        category: 'Emoji',
        author: pack.author,
        sizeMb: pack.sizeMb,
        url: pack.url,
        variants: [{ name: 'Default', weight: 400, url: pack.url, sizeMb: pack.sizeMb }]
      };
      await saveCachedFont(cacheId, cacheItem, combinedBuffer);

      if (downloadProgressFill) {
        downloadProgressFill.value = 100;
        downloadProgressFill.setAttribute('value', '100');
      }
      if (downloadProgressText) downloadProgressText.textContent = `Downloaded ${pack.title}!`;

      setTimeout(() => {
        if (downloadProgressContainer) downloadProgressContainer.style.display = 'none';
      }, 1200);

      store.setState({
        emojiFile: null,
        emojiBuffer: combinedBuffer,
        emojiName: pack.name,
        emojiSource: 'preset',
        emojiUrl: pack.url,
        isDownloadingEmoji: false,
        selectedEmojiPreset: pack.id
      });

      if (emojiSourceBadge) emojiSourceBadge.textContent = 'Preset';
      await registerEmojiPreview(combinedBuffer, pack.name);
      renderCuratedGrid();
      showToast(`Ready to apply ${pack.title}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to download ${pack.title}: ${msg}`);
      if (downloadProgressContainer) downloadProgressContainer.style.display = 'none';
      store.setState({ isDownloadingEmoji: false });
      renderCuratedGrid();
    }
  }

  // 3. Specimen Showcase Glyphs & Categories (<m3e-filter-chip-set>)
  function renderShowcaseCategories(): void {
    if (!categoryBar) return;
    categoryBar.innerHTML = '';
    const chipSet = document.createElement('m3e-filter-chip-set');
    Object.keys(EMOJI_CATEGORIES).forEach(key => {
      const cat = EMOJI_CATEGORIES[key];
      if (!cat) return;
      const chip = document.createElement('m3e-filter-chip') as HTMLElement & { selected?: boolean };
      const isActive = key === activeShowcaseCategory;
      chip.className = `m3-chip ${isActive ? 'active' : ''}`;
      chip.selected = isActive;
      if (isActive) chip.setAttribute('selected', '');
      chip.innerHTML = `<span aria-hidden="true">${cat.icon}</span> <span>${cat.label}</span>`;
      chip.addEventListener('click', () => {
        activeShowcaseCategory = key;
        renderShowcaseCategories();
        renderShowcaseGlyphs();
      });
      chipSet.appendChild(chip);
    });
    categoryBar.appendChild(chipSet);
  }

  function renderShowcaseGlyphs(): void {
    if (!showcaseGrid) return;
    showcaseGrid.innerHTML = '';
    const cat = EMOJI_CATEGORIES[activeShowcaseCategory] || EMOJI_CATEGORIES['smileys'];
    if (!cat) return;

    cat.glyphs.forEach(glyph => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'emoji-cell';
      cell.textContent = glyph;
      cell.setAttribute('aria-label', `Emoji ${glyph}`);
      cell.addEventListener('click', () => {
        if (specimenHero) {
          specimenHero.textContent = (specimenHero.textContent || '') + glyph;
          specimenHero.focus();
        }
      });
      showcaseGrid.appendChild(cell);
    });
  }

  renderShowcaseCategories();
  renderShowcaseGlyphs();

  // 4. Dynamic @font-face Registration (managed via FontEngine slot)
  async function registerEmojiPreview(buffer: ArrayBuffer, fontName: string): Promise<void> {
    try {
      await FontEngine.loadFontFace('CustomEmojiPreview', buffer);
    } catch (err) {
      console.warn('FontFace preview load notice:', err);
    }

    if (emojiInfoRow) emojiInfoRow.style.display = 'flex';
    if (emojiNameElem) emojiNameElem.textContent = fontName;
    if (emojiSizeElem) {
      const mb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
      emojiSizeElem.textContent = `${mb} MB`;
    }
  }

  // 5. Custom File Upload Handling
  if (emojiDropzone && emojiFileInput) {
    emojiDropzone.addEventListener('click', e => {
      if (e.target !== emojiFileInput) {
        emojiFileInput.click();
      }
    });

    emojiDropzone.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        emojiFileInput.click();
      }
    });

    emojiDropzone.addEventListener('dragover', e => {
      e.preventDefault();
      emojiDropzone.classList.add('drag-over');
    });

    emojiDropzone.addEventListener('dragleave', () => {
      emojiDropzone.classList.remove('drag-over');
    });

    emojiDropzone.addEventListener('drop', e => {
      e.preventDefault();
      emojiDropzone.classList.remove('drag-over');
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        processEmojiFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnSelectEmojiFile && emojiFileInput) {
    btnSelectEmojiFile.addEventListener('click', e => {
      e.stopPropagation();
      emojiFileInput.click();
    });
  }

  if (emojiFileInput) {
    emojiFileInput.addEventListener('change', e => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        processEmojiFile(target.files[0]);
      }
    });
  }

  function processEmojiFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async event => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Custom Emoji';

      store.setState({
        emojiFile: file,
        emojiBuffer: buffer,
        emojiName: cleanName,
        emojiSource: 'custom',
        emojiUrl: null,
        selectedEmojiPreset: null
      });

      if (emojiSourceBadge) {
        emojiSourceBadge.textContent = 'Custom File';
      }

      renderCuratedGrid();
      await registerEmojiPreview(buffer, cleanName);
      showToast(`Loaded ${cleanName} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
    };

    reader.onerror = () => {
      showToast('Error reading emoji font file.');
    };

    reader.readAsArrayBuffer(file);
  }

  // 6. Subscribe to state changes to update grid highlights
  store.subscribe(s => s.selectedEmojiPreset, () => {
    renderCuratedGrid();
  });

  store.subscribe(s => s.status, () => {
    renderCuratedGrid();
  });

  // Initial render (instant 0ms)
  renderCuratedGrid();
}
