/**
 * Fontify - Emoji Tab Controller
 * Curated Material 3 emoji card grid (iOS 26, iOS 18, Fluent, OneUI, Twitter, Google),
 * local IndexedDB binary caching, streaming downloads, dynamic @font-face preview,
 * and custom font file importing.
 */

import { store } from '../state/store';
import { fontService } from '../bridge/service';
import { showToast } from './components/toast';
import { showConfirmDialog, runApplyWorkflow } from './components/dialog';
import {
  getCachedEmoji,
  saveCachedEmoji
} from '../state/emojiCache';

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

// 6 Curated Emoji Packs requested by user (iOS 26, iOS 18, Fluent, OneUI, Twitter, Google)
export const CURATED_EMOJI_PACKS: CuratedEmojiPack[] = [
  {
    id: 'ios-26',
    name: 'iOS 26.4 (Unicode 17)',
    title: 'iOS 26 (Apple)',
    icon: '🍎',
    description: 'Clean Apple Unicode 17',
    author: 'Apple / MFFM',
    sizeMb: '33.7 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/iOS%2026.4%20(Unicode%2017).ttf'
  },
  {
    id: 'ios',
    name: 'iOS 18.4 (Apple)',
    title: 'iOS 18 (Apple)',
    icon: '🍎',
    description: 'Clean Apple emoji styling',
    author: 'Apple',
    sizeMb: '41.1 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2025/iOS18.4.ttf'
  },
  {
    id: 'fluent',
    name: 'Microsoft FluentUI 3D',
    title: 'Fluent 3D',
    icon: '🪟',
    description: 'Modern Microsoft Fluent design',
    author: 'Microsoft',
    sizeMb: '24.0 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/FluentUI%20Unicode%2016.0.ttf'
  },
  {
    id: 'samsung',
    name: 'Samsung One UI 7 Beta',
    title: 'Samsung One UI',
    icon: '📱',
    description: 'Vibrant Galaxy emoji style',
    author: 'Samsung / MFFM',
    sizeMb: '18.5 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2025/SamsungOneUI7Beta_Unicode16_No_Space.ttf'
  },
  {
    id: 'twemoji',
    name: 'Twemoji 15.0.3 (Twitter/X)',
    title: 'Twemoji (Twitter)',
    icon: '🐦',
    description: 'Flat, colorful Twitter/X design',
    author: 'Twemoji / X',
    sizeMb: '3.2 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2024/Twemoji-v15.0.3.ttf'
  },
  {
    id: 'noto',
    name: 'Google Noto Color (Stock)',
    title: 'Google Noto (Stock)',
    icon: '🤖',
    description: 'Standard Android system emojis',
    author: 'Google',
    sizeMb: '10.2 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2024/NotoColorEmojiu16PNG_v041024[MFFMEmoji].ttf'
  }
];

// Presets exported for backward compatibility & test verification
export const FLAGSHIP_PRESETS: EmojiPreset[] = [
  {
    id: 'ios-26',
    name: 'iOS 26.4 (Unicode 17)',
    icon: '🍎',
    category: 'apple',
    description: 'Clean Apple Unicode 17',
    author: 'Apple / MFFM',
    sizeMb: '33.7 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/iOS%2026.4%20(Unicode%2017).ttf'
  },
  {
    id: 'ios',
    name: 'iOS 18.4 (Apple)',
    icon: '🍎',
    category: 'apple',
    description: 'Clean Apple emoji styling',
    author: 'Apple',
    sizeMb: '41.1 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2025/iOS18.4.ttf'
  },
  {
    id: 'samsung',
    name: 'Samsung One UI 7 Beta',
    icon: '📱',
    category: 'samsung',
    description: 'Vibrant Galaxy emoji style',
    author: 'Samsung / MFFM',
    sizeMb: '18.5 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2025/SamsungOneUI7Beta_Unicode16_No_Space.ttf'
  },
  {
    id: 'fluent',
    name: 'Microsoft FluentUI 3D',
    icon: '🪟',
    category: 'fluent',
    description: 'Modern Microsoft Fluent design',
    author: 'Microsoft',
    sizeMb: '24.0 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/FluentUI%20Unicode%2016.0.ttf'
  },
  {
    id: 'twemoji',
    name: 'Twemoji 15.0.3 (Twitter/X)',
    icon: '🐦',
    category: 'twemoji',
    description: 'Flat, colorful Twitter/X design',
    author: 'Twemoji / X',
    sizeMb: '3.2 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2024/Twemoji-v15.0.3.ttf'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp 2.26',
    icon: '💬',
    category: 'whatsapp',
    description: 'WhatsApp modern emoji set',
    author: 'WhatsApp',
    sizeMb: '33.7 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/WhatsApp%202.26.8.72.ttf'
  },
  {
    id: 'facebook',
    name: 'Facebook 16.0',
    icon: '👥',
    category: 'facebook',
    description: 'Facebook system emojis',
    author: 'Meta',
    sizeMb: '37.6 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/Facebook%2016.0.ttf'
  },
  {
    id: 'joypixels',
    name: 'JoyPixels 10',
    icon: '✨',
    category: 'joypixels',
    description: 'JoyPixels color emojis',
    author: 'JoyPixels',
    sizeMb: '26.3 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/2026/04/JoyPixel%2010.ttf'
  },
  {
    id: 'noto',
    name: 'Google Noto Color (Stock)',
    icon: '🤖',
    category: 'noto',
    description: 'Standard Android system emojis',
    author: 'Google',
    sizeMb: '10.2 MB',
    url: 'https://raw.githubusercontent.com/zFont/Host/main/Font/Emoji/2024/NotoColorEmojiu16PNG_v041024[MFFMEmoji].ttf'
  }
];

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

  await runApplyWorkflow({
    title: 'Apply Emoji Font?',
    body: `Install <strong>${state.emojiName || 'Custom Emoji'}</strong> across SystemUI and apps?<br><br>A device restart is required to reload system emojis.`,
    confirmText: 'Apply Emoji',
    iconType: 'apply',
    onApply: async (onProgress) => {
      await fontService.applyEmoji({
        emojiBuffer: state.emojiBuffer!,
        emojiFile: state.emojiFile,
        emojiName: state.emojiName,
        emojiSource: state.emojiSource || 'custom',
        emojiUrl: state.emojiUrl || undefined,
        onProgress
      });
    },
    onReboot: async () => {
      await fontService.reboot();
    },
    onCancelReboot: () => {
      store.setState({ rebootRequired: true });
      showToast('Reboot postponed. Restart anytime from the Overview tab.');
    }
  });
}

export async function restoreStockEmoji(): Promise<void> {
  const confirmed = await showConfirmDialog({
    title: 'Revert to Stock Emojis?',
    body: 'Remove custom emoji overlays and restore standard Google system emojis? This does not alter your typeface font configuration.',
    confirmText: 'Revert',
    iconType: 'revert'
  });

  if (!confirmed) return;

  showToast('Restoring stock emojis...');
  try {
    await fontService.restoreEmojiStock();
    store.setState({ rebootRequired: true });
    showToast('Stock emojis restored! Restart device to apply.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Failed to restore stock emojis: ${msg}`);
  }
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
  const downloadProgressFill = document.getElementById('emoji-download-progress-fill');
  const downloadProgressText = document.getElementById('emoji-download-progress-text');

  const categoryBar = document.getElementById('emoji-category-bar');
  const showcaseGrid = document.getElementById('emoji-showcase-grid');
  const specimenHero = document.getElementById('emoji-specimen-hero');

  const btnApplyEmoji = document.getElementById('btn-apply-emoji') as HTMLButtonElement | null;
  const btnRestoreEmoji = document.getElementById('btn-restore-emoji') as HTMLButtonElement | null;
  const btnEmojiReboot = document.getElementById('btn-emoji-reboot') as HTMLButtonElement | null;

  // 1. Render Curated 2-Column Emoji Grid
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

      const card = document.createElement('div');
      card.className = `curated-emoji-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-id', pack.id);
      card.setAttribute('aria-label', `${pack.title}: ${pack.description}`);

      card.innerHTML = `
        <div class="curated-card-icon" aria-hidden="true">${pack.icon}</div>
        <div class="curated-card-title">${pack.title}</div>
        <div class="curated-card-desc">${pack.description}</div>
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

    // Check if already in IndexedDB cache
    const cachedBuffer = await getCachedEmoji(pack.id);
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

    // Stream download with progress
    store.setState({
      isDownloadingEmoji: true,
      downloadEmojiProgress: 0,
      downloadEmojiMessage: `Connecting to ${pack.title}...`,
      selectedEmojiPreset: pack.id
    });

    renderCuratedGrid();

    if (downloadProgressContainer) downloadProgressContainer.style.display = 'block';
    if (downloadProgressText) downloadProgressText.textContent = `Downloading ${pack.title}...`;

    try {
      const response = await fetch(pack.url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      let combinedBuffer: ArrayBuffer;

      if (!response.body || totalBytes === 0) {
        combinedBuffer = await response.arrayBuffer();
      } else {
        const reader = response.body.getReader();
        let receivedBytes = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedBytes += value.length;

          if (totalBytes > 0) {
            const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            if (downloadProgressFill) downloadProgressFill.style.width = `${percent}%`;
            if (downloadProgressText) {
              const mbNow = (receivedBytes / (1024 * 1024)).toFixed(1);
              const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
              downloadProgressText.textContent = `Downloading ${pack.title}: ${percent}% (${mbNow}/${mbTotal} MB)`;
            }
          }
        }

        const combined = new Uint8Array(receivedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        combinedBuffer = combined.buffer;
      }

      // Save to IndexedDB cache
      await saveCachedEmoji(pack.id, pack.name, combinedBuffer);

      if (downloadProgressFill) downloadProgressFill.style.width = '100%';
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

  // 3. Specimen Showcase Glyphs & Categories
  function renderShowcaseCategories(): void {
    if (!categoryBar) return;
    categoryBar.innerHTML = '';
    Object.keys(EMOJI_CATEGORIES).forEach(key => {
      const cat = EMOJI_CATEGORIES[key];
      if (!cat) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `m3-chip ${key === activeShowcaseCategory ? 'active' : ''}`;
      btn.innerHTML = `<span aria-hidden="true">${cat.icon}</span> <span>${cat.label}</span>`;
      btn.addEventListener('click', () => {
        activeShowcaseCategory = key;
        renderShowcaseCategories();
        renderShowcaseGlyphs();
      });
      categoryBar.appendChild(btn);
    });
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

  // 4. Dynamic @font-face Registration
  async function registerEmojiPreview(buffer: ArrayBuffer, fontName: string): Promise<void> {
    try {
      if (typeof FontFace !== 'undefined' && document.fonts) {
        const customFace = new FontFace('CustomEmojiPreview', buffer);
        const loadedFace = await customFace.load();
        document.fonts.add(loadedFace);
      }
    } catch (err) {
      console.warn('FontFace preview load notice:', err);
    }

    if (emojiInfoRow) emojiInfoRow.style.display = 'block';
    if (emojiNameElem) emojiNameElem.textContent = fontName;
    if (emojiSizeElem) {
      const mb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
      emojiSizeElem.textContent = `${mb} MB`;
    }
    if (btnApplyEmoji) btnApplyEmoji.disabled = false;
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

  // 6. Action button listeners
  if (btnApplyEmoji) {
    btnApplyEmoji.addEventListener('click', applySelectedEmoji);
  }

  if (btnRestoreEmoji) {
    btnRestoreEmoji.addEventListener('click', restoreStockEmoji);
  }

  if (btnEmojiReboot) {
    btnEmojiReboot.addEventListener('click', async () => {
      await showConfirmDialog({
        title: 'Reboot Device',
        body: 'Restart system to load updated emoji overlays?',
        confirmText: 'Reboot',
        iconType: 'reboot',
        onConfirm: () => fontService.reboot()
      });
    });
  }

  // 7. Subscribe to state changes to update grid highlights
  store.subscribe(s => s.selectedEmojiPreset, () => {
    renderCuratedGrid();
  });

  store.subscribe(s => s.status, () => {
    renderCuratedGrid();
  });

  // Initial render (instant 0ms)
  renderCuratedGrid();
}
