/**
 * Fontify - Browse Tab Controller (M3 Expressive)
 * Handles online font & emoji discovery, search, filtering, infinite scrolling,
 * dynamic @font-face live specimen preview, direct system font/emoji streaming,
 * and opening fonts directly in the Customize workspace.
 */

import { store } from '../state/store';
import { fontService } from '../bridge/service';
import { FontParser } from '../font/parser';
import { FontEngine } from '../font/engine';
import {
  deriveCustomizeSelection,
  getStaticVariants,
  getVariableVariant,
  getWeightLabel,
  isVariableItem,
  isVariableVariant
} from '../font/variants';

export { getStaticVariants, getVariableVariant, isVariableItem, getWeightLabel as getWeightName };
import { showToast } from './components/toast';
import { runApplyWorkflow } from './components/dialog';
import {
  getItems,
  getItemById,
  resolveVariant,
  downloadAndCacheFont,
  syncOnlineCatalog
} from '../browse/catalogService';
import {
  getAllCachedFontIds,
  deleteCachedFont
} from '../browse/fontCache';
import { removeCachedEmoji } from '../state/emojiCache';
import type {
  BrowseItem,
  BrowseFilterState,
  FontVariant
} from '../browse/types';
import { navigateToTab } from './navigation';

const PAGE_SIZE = 24;

interface ExtendedFilterState extends BrowseFilterState {
  isVariable?: boolean;
}

interface BrowseState {
  filters: Partial<ExtendedFilterState>;
  items: BrowseItem[];
  cachedIds: Set<string>;
  displayedCount: number;
  activeItem: BrowseItem | null;
  activeVariant: FontVariant | null;
  isLoading: boolean;
  isDownloading: boolean;
}

const state: BrowseState = {
  filters: {
    query: '',
    type: 'font',
    source: 'all',
    category: 'all',
    downloadedOnly: false
  },
  items: [],
  cachedIds: new Set(),
  displayedCount: PAGE_SIZE,
  activeItem: null,
  activeVariant: null,
  isLoading: false,
  isDownloading: false
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type ProgressIndicatorLike = HTMLElement & { value?: number };
type BottomSheetLike = HTMLElement & {
  open?: boolean;
  show?: (detent?: number) => void;
  hide?: () => void;
};
type DialogLike = HTMLElement & {
  show?: () => void;
  hide?: () => void;
};

function updateDownloadProgress(visible: boolean, percent = 0, message = 'Downloading...') {
  const clamped = Math.min(100, Math.max(0, percent));
  const rounded = Math.round(clamped);

  // 1. In-modal progress elements (visible directly inside the active preview bottom sheet)
  const modalBox = document.getElementById('modal-download-progress-box');
  const modalFill = document.getElementById('modal-download-progress-fill') as ProgressIndicatorLike | null;
  const modalText = document.getElementById('modal-download-progress-text');
  const modalPct = document.getElementById('modal-download-progress-pct');

  if (modalBox) {
    if (!visible) {
      modalBox.style.display = 'none';
    } else {
      modalBox.style.display = 'block';
      if (modalFill) {
        modalFill.value = clamped;
        modalFill.setAttribute?.('value', String(clamped));
      }
      if (modalText) modalText.textContent = message;
      if (modalPct) modalPct.textContent = `${rounded}%`;
    }
  }

  // 2. Background Browse UI progress elements (visible in view-browse behind modal or when closed)
  const box = document.getElementById('browse-download-progress-box');
  const fill = document.getElementById('browse-download-progress-fill') as ProgressIndicatorLike | null;
  const text = document.getElementById('browse-download-progress-text');
  const pct = document.getElementById('browse-download-progress-pct');

  if (box) {
    if (!visible) {
      box.style.display = 'none';
    } else {
      box.style.display = 'block';
      if (fill) {
        fill.value = clamped;
        fill.setAttribute?.('value', String(clamped));
      }
      if (text) text.textContent = message;
      if (pct) pct.textContent = `${rounded}%`;
    }
  }
}

export const SUBSET_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?\'"-/()[]{}@#%&*+=_';

export function buildSubsetText(item: BrowseItem, extraText = ''): string {
  const combined = `${SUBSET_CHARS}${item.name}${item.previewText || ''}${extraText}`;
  return Array.from(new Set(combined.split(''))).filter((c) => c !== '\n' && c !== '\r').join('');
}

export function updateSpecimenWeight(item: BrowseItem, variant: FontVariant): void {
  const specimen = document.getElementById('preview-specimen-box');
  if (!specimen) return;

  const isVar = isVariableItem(item);
  const isVarVariant = variant.weight === '100-900' || variant.name.toLowerCase().includes('variable');
  const targetWeight = isVarVariant
    ? 400
    : typeof variant.weight === 'number'
    ? variant.weight
    : parseInt(String(variant.weight), 10) || 400;

  specimen.style.fontWeight = String(targetWeight);
  if (isVar) {
    specimen.style.fontVariationSettings = `'wght' ${targetWeight}`;
  } else {
    specimen.style.fontVariationSettings = '';
  }
}

/**
 * In-card live preview font loader with viewport IntersectionObserver and multi-family batching
 */
const loadedGridFonts = new Set<string>();
let gridFontObserver: IntersectionObserver | null = null;
let batchLoadTimer: ReturnType<typeof setTimeout> | null = null;
const pendingFontFamilies = new Set<string>();

function flushFontBatch(): void {
  if (typeof document === 'undefined' || !document.head) return;
  const familiesToLoad = Array.from(pendingFontFamilies);
  pendingFontFamilies.clear();
  if (familiesToLoad.length === 0) return;

  // Batch up to 12 families per CSS link to keep URLs performant and concise
  for (let i = 0; i < familiesToLoad.length; i += 12) {
    const chunk = familiesToLoad.slice(i, i + 12);
    const params = chunk
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400`)
      .join('&');
    const gfUrl = `https://fonts.googleapis.com/css2?${params}&display=swap`;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = gfUrl;
    document.head.appendChild(link);
  }
}

function queueFontBatch(family: string): void {
  if (loadedGridFonts.has(family)) return;
  loadedGridFonts.add(family);
  pendingFontFamilies.add(family);

  if (batchLoadTimer) clearTimeout(batchLoadTimer);
  batchLoadTimer = setTimeout(flushFontBatch, 40);
}

export function observeCardFonts(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof document.querySelectorAll !== 'function') return;

  if (typeof IntersectionObserver === 'undefined') {
    return;
  }

  if (!gridFontObserver) {
    gridFontObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const family = card.getAttribute('data-font-family');
            if (family) {
              queueFontBatch(family);
            }
            gridFontObserver?.unobserve(card);
          }
        });
      },
      {
        rootMargin: '250px 0px',
        threshold: 0.01
      }
    );
  }

  const cards = document.querySelectorAll<HTMLElement>('.browse-card[data-font-family]');
  cards.forEach((card) => {
    const family = card.getAttribute('data-font-family');
    if (family && !loadedGridFonts.has(family)) {
      gridFontObserver?.observe(card);
    }
  });
}

export async function refreshCatalogGrid(resetPaging = false): Promise<void> {
  const grid = document.getElementById('browse-grid');
  if (!grid) return;

  state.isLoading = true;

  if (resetPaging) {
    state.displayedCount = PAGE_SIZE;
  }

  try {
    let [matchingItems, cachedIdList] = await Promise.all([
      getItems(state.filters),
      getAllCachedFontIds()
    ]);

    // Respect variable font filter
    if (state.filters.isVariable) {
      matchingItems = matchingItems.filter((item) => isVariableItem(item));
    }

    state.items = matchingItems;
    state.cachedIds = new Set(cachedIdList);

    renderGridItems();
  } catch (err) {
    console.error('[Browse] Failed to load catalog items:', err);
    if (grid) {
      grid.innerHTML = `
        <div class="browse-empty-state">
          <div class="browse-empty-title">Failed to load catalog</div>
          <div class="browse-empty-desc">An error occurred while loading fonts. Please try again.</div>
        </div>
      `;
    }
  } finally {
    state.isLoading = false;
  }
}

function renderGridItems(): void {
  const grid = document.getElementById('browse-grid');
  if (!grid) return;

  if (state.items.length === 0) {
    grid.innerHTML = `
      <div class="browse-empty-state">
        <m3e-icon name="search" aria-hidden="true"></m3e-icon>
        <div class="browse-empty-title">No fonts or emojis found</div>
        <div class="browse-empty-desc">Try clearing your search query or adjusting your filters.</div>
      </div>
    `;
    return;
  }

  const itemsToRender = state.items.slice(0, state.displayedCount);

  grid.innerHTML = itemsToRender
    .map((item) => {
      const isCached = state.cachedIds.has(item.id);
      const isGoogle = item.source === 'google';
      const sourceLabel = isGoogle ? 'Google' : 'zFont';
      const isVar = isVariableItem(item);
      const variantCount = item.variants?.length || 1;
      const singleWeightName = item.variants?.[0]?.weight
        ? getWeightLabel(item.variants[0].weight, item.variants[0].name)
        : item.variants?.[0]?.name || 'Regular';
      const variantLabel =
        item.type === 'emoji'
          ? 'Emoji Pack'
          : isVar
          ? `Variable (${variantCount} weights)`
          : variantCount > 1
          ? `${variantCount} weights`
          : singleWeightName;

      const previewHtml =
        item.type === 'emoji'
          ? (item.thumbnailUrl
              ? `<img class="browse-specimen-emoji-img" src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" onerror="if(this.dataset.fb!=='1'){this.dataset.fb='1';this.src=this.src.replace('cdn.jsdelivr.net/gh/zFont/Host@main','raw.githubusercontent.com/zFont/Host/main');}" />`
              : `<div class="browse-specimen-emoji">😀 🥳 😎 👍 🔥 ❤️ 🚀 ✨ 💯</div>`)
          : `<div class="browse-specimen-text" style="font-family: &quot;${escapeHtml(item.name)}&quot;, sans-serif;">${escapeHtml(
              item.previewText || 'Sphinx of black quartz, judge my vow.'
            )}</div>`;

      return `
        <m3e-card class="browse-card" variant="filled" actionable data-id="${escapeHtml(item.id)}" ${item.type === 'font' && isGoogle ? `data-font-family="${escapeHtml(item.name)}"` : ''} role="listitem" tabindex="0">
          <div slot="content">
            <div class="browse-card-header">
              <div class="browse-card-title-group">
                <div class="browse-card-title">${escapeHtml(item.name)}</div>
                <div class="browse-card-meta">${escapeHtml(
                  item.author || (isGoogle ? 'Google Fonts' : 'zFont')
                )}${item.sizeMb ? ` • ${escapeHtml(item.sizeMb)}` : ''}</div>
              </div>
              <div class="browse-card-badges">
                ${isVar ? '<m3e-badge class="browse-badge-variable">Variable</m3e-badge>' : ''}
                <m3e-badge>${sourceLabel}</m3e-badge>
                ${isCached ? '<m3e-badge class="browse-badge-downloaded">Downloaded</m3e-badge>' : ''}
              </div>
            </div>
            <div class="browse-specimen-box">
              ${previewHtml}
            </div>
            <div class="browse-card-footer">
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--md-sys-color-on-surface-variant); margin-right: auto;">${escapeHtml(variantLabel)}</span>
              ${
                isCached
                  ? `<m3e-button class="browse-btn-delete" variant="outlined" size="small" type="button" data-action="delete" data-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)} download">Delete</m3e-button>`
                  : ''
              }
              <m3e-button class="browse-btn-preview" variant="tonal" size="small" type="button" data-action="preview" data-id="${escapeHtml(item.id)}">Preview</m3e-button>
            </div>
          </div>
        </m3e-card>
      `;
    })
    .join('');

  // If there are more items to show, append sentinel for infinite scroll
  if (state.displayedCount < state.items.length) {
    const sentinel = document.createElement('div');
    sentinel.id = 'browse-scroll-sentinel';
    sentinel.style.width = '100%';
    sentinel.style.height = '40px';
    sentinel.style.display = 'flex';
    sentinel.style.alignItems = 'center';
    sentinel.style.justifyContent = 'center';
    sentinel.innerHTML = `<span style="font-size: 0.8125rem; color: var(--md-sys-color-outline);">Showing ${itemsToRender.length} of ${state.items.length} items</span>`;
    grid.appendChild(sentinel);
  }

  // Observe visible cards to stream live Google Fonts directly into specimen boxes
  observeCardFonts();

  // Prefetch edge CDN preview thumbnails for initial visible emoji cards
  if (state.filters.type === 'emoji' && typeof Image !== 'undefined') {
    itemsToRender.slice(0, 12).forEach((item) => {
      if (item.thumbnailUrl) {
        const prefetchImg = new Image();
        prefetchImg.src = item.thumbnailUrl;
      }
    });
  }
}

export function openPreviewSheet(item: BrowseItem): void {
  const sheet = document.getElementById('browse-preview-sheet') as BottomSheetLike | null;
  const container = document.getElementById('browse-preview-container');
  if (!container) return;

  state.activeItem = item;

  const isGoogle = item.source === 'google';
  const sourceLabel = isGoogle ? 'Google Fonts' : 'zFont';
  const isEmoji = item.type === 'emoji';
  const isVar = isVariableItem(item);
  const isCached = state.cachedIds.has(item.id);

  const variableVariant = getVariableVariant(item);
  const staticVariants = getStaticVariants(item);

  state.activeVariant = isVar && variableVariant ? variableVariant : resolveVariant(item);

  const defaultSpecimen = isEmoji
    ? '😀 🥳 😎 👍 🔥 ❤️ 🚀 ✨ 💯 🐱 🍕 ☕ 🌺 🥑 🏝️ ⚡'
    : 'Sphinx of black quartz, judge my vow. 1234567890\nThe quick brown fox jumps over the lazy dog.';

  let variantsHtml = '';
  if (isVar || staticVariants.length > 1) {
    const varChipHtml = isVar && variableVariant
      ? `<m3e-filter-chip class="browse-variant-chip browse-variant-chip-variable selected" selected data-variant-type="variable" data-variant-name="${escapeHtml(variableVariant.name)}" data-variant-weight="100-900">Variable (100–900)</m3e-filter-chip>`
      : '';

    const staticChipsHtml = staticVariants
      .map((v) => {
        const isSelected = !isVar && (v.name === state.activeVariant?.name || v.weight === state.activeVariant?.weight);
        const weightLabel = getWeightLabel(v.weight, v.name);
        return `<m3e-filter-chip class="browse-variant-chip ${isSelected ? 'selected' : ''}" ${isSelected ? 'selected' : ''} data-variant-type="static" data-variant-name="${escapeHtml(v.name)}" data-variant-weight="${v.weight}">${escapeHtml(weightLabel)}</m3e-filter-chip>`;
      })
      .join('');

    variantsHtml = `
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--md-sys-color-on-surface-variant);">Styles</span>
        <m3e-filter-chip-set class="browse-variants-row" id="preview-variant-chips">
          ${varChipHtml}
          ${staticChipsHtml}
        </m3e-filter-chip-set>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="preview-sheet-header">
      <div style="display: flex; flex-direction: column; min-width: 0;">
        <h3 id="browse-preview-title" style="font-size: 1.25rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 0;">${escapeHtml(item.name)}</h3>
        <span style="font-size: 0.8125rem; color: var(--md-sys-color-on-surface-variant); margin-top: 2px;">
          ${escapeHtml(item.author || sourceLabel)}${item.sizeMb ? ` • ${escapeHtml(item.sizeMb)}` : ''}
        </span>
      </div>
      <m3e-icon-button id="preview-close-btn" aria-label="Close preview">
        <m3e-icon name="close"></m3e-icon>
      </m3e-icon-button>
    </div>

    <div class="preview-sheet-badges">
      ${isVar ? '<m3e-badge class="browse-badge-variable">Variable</m3e-badge>' : ''}
      <m3e-badge>${sourceLabel}</m3e-badge>
      ${isCached ? '<m3e-badge class="browse-badge-downloaded">Downloaded</m3e-badge>' : ''}
    </div>

    ${variantsHtml}

    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--md-sys-color-on-surface-variant);">${isEmoji ? 'Emoji Specimen' : 'Live Specimen'}</span>
        <span id="preview-load-status" style="font-size: 0.75rem; color: var(--md-sys-color-primary);">Loading preview...</span>
      </div>
      ${
        isEmoji && item.thumbnailUrl
          ? `<div class="browse-emoji-specimen-wrap">
              <div id="preview-emoji-spinner" style="display: flex; align-items: center; justify-content: center; height: 90px;">
                <m3e-loading-indicator variant="contained"></m3e-loading-indicator>
              </div>
              <img id="preview-emoji-img" class="browse-emoji-specimen-img" src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.name)}" style="display: none;" onerror="if(this.dataset.fb!=='1'){this.dataset.fb='1';this.src=this.src.replace('cdn.jsdelivr.net/gh/zFont/Host@main','raw.githubusercontent.com/zFont/Host/main');}" />
              <span style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant); margin-top: 8px;">Authentic ${escapeHtml(item.name)} glyph rendering</span>
             </div>`
          : ''
      }
      <div
        id="preview-specimen-box"
        class="browse-preview-specimen ${isEmoji ? 'browse-specimen-emoji' : 'browse-specimen-text'}"
      >${escapeHtml(defaultSpecimen)}</div>
    </div>

    <!-- In-Modal Download Progress Bar (Wavy Expressive) -->
    <div id="modal-download-progress-box" class="browse-progress-box" style="display: none; margin-top: 6px; margin-bottom: 2px; width: 100%;">
      <div class="browse-progress-header">
        <span id="modal-download-progress-text">Downloading...</span>
        <span id="modal-download-progress-pct">0%</span>
      </div>
      <m3e-linear-progress-indicator id="modal-download-progress-fill" variant="wavy" max="100" value="0"></m3e-linear-progress-indicator>
    </div>

    <div class="preview-sheet-actions">
      <m3e-button variant="filled" id="btn-preview-apply" type="button">
        Apply Directly
      </m3e-button>
      ${
        !isEmoji
          ? `<m3e-button variant="tonal" id="btn-preview-customize" type="button">
              Open in Customize
            </m3e-button>`
          : ''
      }
      ${
        isCached
          ? `<m3e-button variant="outlined" id="btn-preview-delete" type="button">
              Delete Download
            </m3e-button>`
          : ''
      }
    </div>
  `;

  if (sheet) {
    if (typeof sheet.show === 'function') {
      sheet.show(0);
    } else {
      sheet.style.display = 'block';
      sheet.removeAttribute('aria-hidden');
    }
  }

  // Wire close button
  document.getElementById('preview-close-btn')?.addEventListener('click', closePreviewSheet);

  // Wire authentic emoji preview specimen loading & status
  if (isEmoji && item.thumbnailUrl) {
    const emojiImg = document.getElementById('preview-emoji-img') as HTMLImageElement | null;
    const emojiSpinner = document.getElementById('preview-emoji-spinner');
    const statusEl = document.getElementById('preview-load-status');
    if (emojiImg) {
      const showImage = () => {
        if (emojiSpinner) emojiSpinner.style.display = 'none';
        emojiImg.style.display = 'block';
        if (statusEl && state.activeItem?.id === item.id) {
          statusEl.textContent = '✓ Specimen ready';
          statusEl.style.color = 'var(--md-sys-color-primary)';
        }
      };
      if (emojiImg.complete && emojiImg.naturalWidth > 0) {
        showImage();
      } else {
        emojiImg.addEventListener('load', showImage);
        emojiImg.addEventListener('error', () => {
          if (emojiImg.dataset.fb !== '1') {
            emojiImg.dataset.fb = '1';
            emojiImg.src = emojiImg.src.replace('cdn.jsdelivr.net/gh/zFont/Host@main', 'raw.githubusercontent.com/zFont/Host/main');
          } else {
            if (emojiSpinner) emojiSpinner.innerHTML = '<span style="font-size: 0.8125rem; color: var(--md-sys-color-error);">Specimen unavailable offline</span>';
            if (statusEl && state.activeItem?.id === item.id) {
              statusEl.textContent = 'Preview offline';
              statusEl.style.color = 'var(--md-sys-color-outline)';
            }
          }
        });
      }
    }
  }

  // Wire variant selector chips
  const chips = container.querySelectorAll<HTMLButtonElement>('.browse-variant-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');

      const vType = chip.getAttribute('data-variant-type');
      const vWeight = chip.getAttribute('data-variant-weight');
      const vName = chip.getAttribute('data-variant-name');

      if (vType === 'variable' && variableVariant) {
        state.activeVariant = variableVariant;
        updateSpecimenWeight(item, variableVariant);
      } else {
        const matched = staticVariants.find((v) => String(v.weight) === vWeight || v.name === vName);
        if (matched) {
          state.activeVariant = matched;
          updateSpecimenWeight(item, matched);
        }
      }
    });
  });

  // Wire actions
  document.getElementById('btn-preview-apply')?.addEventListener('click', () => {
    handleApplyDirectly(item, state.activeVariant || undefined);
  });

  document.getElementById('btn-preview-customize')?.addEventListener('click', () => {
    handleOpenInCustomize(item, state.activeVariant || undefined);
  });

  document.getElementById('btn-preview-delete')?.addEventListener('click', () => {
    handleDeleteCachedFont(item);
  });

  // Asynchronously load and inject zero-download Google Fonts CSS2 subset
  loadPreviewFontFace(item, state.activeVariant || undefined);
}

export function closePreviewSheet(): void {
  const sheet = document.getElementById('browse-preview-sheet') as BottomSheetLike | null;
  if (sheet) {
    if (typeof sheet.hide === 'function') {
      sheet.hide();
    } else {
      sheet.style.display = 'none';
      sheet.setAttribute('aria-hidden', 'true');
    }
  }
  state.activeItem = null;
  state.activeVariant = null;
}

export async function loadPreviewFontFace(item: BrowseItem, variant?: FontVariant): Promise<void> {
  const statusEl = document.getElementById('preview-load-status');
  const specimen = document.getElementById('preview-specimen-box');
  if (!specimen) return;

  const resolvedVar = variant || state.activeVariant || resolveVariant(item);
  const isVar = isVariableItem(item);
  const isVarVariant = resolvedVar.weight === '100-900' || resolvedVar.name.toLowerCase().includes('variable');
  const targetWeight = isVarVariant
    ? 400
    : typeof resolvedVar.weight === 'number'
    ? resolvedVar.weight
    : parseInt(String(resolvedVar.weight), 10) || 400;

  specimen.style.fontWeight = String(targetWeight);
  if (isVar) {
    specimen.style.fontVariationSettings = `'wght' ${targetWeight}`;
  } else {
    specimen.style.fontVariationSettings = '';
  }

  // Handle emoji packs separately
  if (item.type === 'emoji') {
    if (statusEl) {
      statusEl.textContent = 'Emoji pack preview';
      statusEl.style.color = 'var(--md-sys-color-primary)';
    }
    specimen.style.fontFamily = `'CustomEmojiPreview', "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    return;
  }

  // Zero-Download Google Fonts CSS2 Subsetting API
  try {
    if (statusEl) {
      statusEl.textContent = 'Loading live preview...';
      statusEl.style.color = 'var(--md-sys-color-primary)';
    }

    const familyParam = encodeURIComponent(item.name).replace(/%20/g, '+');
    const subsetText = buildSubsetText(item, specimen.textContent || '');

    // Weight range or weights
    const availableWeights = (item.availableWeights && item.availableWeights.length > 0)
      ? item.availableWeights
      : item.weights && item.weights.length > 0
      ? item.weights
      : [400];

    let wghtSpec = '';
    if (isVar) {
      const minW = Math.min(...availableWeights);
      const maxW = Math.max(...availableWeights);
      wghtSpec = minW < maxW ? `wght@${minW}..${maxW}` : `wght@${minW}`;
    } else {
      wghtSpec = `wght@${availableWeights.join(';')}`;
    }

    const gfUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:${wghtSpec}&display=swap&text=${encodeURIComponent(subsetText)}`;
    const fallbackUrl = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

    let linkEl = document.getElementById('browse-gf-preview-css') as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'browse-gf-preview-css';
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
    }

    linkEl.onload = () => {
      if (statusEl && state.activeItem?.id === item.id) {
        statusEl.textContent = '✓ Live preview loaded';
        statusEl.style.color = 'var(--md-sys-color-primary)';
      }
    };

    linkEl.onerror = () => {
      // Fallback: try family request without weight specification
      if (linkEl && linkEl.href !== fallbackUrl) {
        linkEl.href = fallbackUrl;
      } else if (statusEl && state.activeItem?.id === item.id) {
        statusEl.textContent = 'Previewing with system fallback';
        statusEl.style.color = 'var(--md-sys-color-outline)';
      }
    };

    linkEl.href = gfUrl;

    // Apply font-family to specimen box smoothly
    specimen.style.fontFamily = `"${item.name}", sans-serif`;

    // Wait for document.fonts if available
    if (typeof document !== 'undefined' && 'fonts' in document && typeof (document as any).fonts.load === 'function') {
      (document as any).fonts.load(`${targetWeight} 16px "${item.name}"`).then(() => {
        if (statusEl && state.activeItem?.id === item.id) {
          statusEl.textContent = '✓ Live preview loaded';
          statusEl.style.color = 'var(--md-sys-color-primary)';
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Browse] Failed to load zero-download live preview:', err);
    if (statusEl) {
      statusEl.textContent = 'Previewing with system fallback';
      statusEl.style.color = 'var(--md-sys-color-outline)';
    }
  }
}

export async function handleDeleteCachedFont(item: BrowseItem): Promise<void> {
  try {
    await deleteCachedFont(item.id);
    if (item.type === 'emoji') {
      try {
        await removeCachedEmoji(item.id.replace(/^emoji-/, ''));
      } catch (_) {}
    }
    state.cachedIds.delete(item.id);
    showToast(`Deleted ${item.name} from downloads`);

    // If currently previewing this item in the bottom sheet, remove the delete button and downloaded badge
    if (state.activeItem?.id === item.id) {
      document.getElementById('btn-preview-delete')?.remove();
      const sheet = document.getElementById('browse-preview-sheet');
      sheet?.querySelectorAll('.browse-badge-downloaded').forEach((b) => b.remove());
    }

    // If currently viewing downloaded fonts only, remove from displayed list
    if (state.filters.downloadedOnly) {
      state.items = state.items.filter((i) => i.id !== item.id);
      if (state.activeItem?.id === item.id) {
        closePreviewSheet();
      }
    }

    renderGridItems();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Failed to delete downloaded font: ${msg}`);
  }
}

export async function handleApplyDirectly(item: BrowseItem, variant?: FontVariant): Promise<void> {
  const applyBtn = document.getElementById('btn-preview-apply') as HTMLButtonElement | null;
  const customizeBtn = document.getElementById('btn-preview-customize') as HTMLButtonElement | null;
  const deleteBtn = document.getElementById('btn-preview-delete') as HTMLButtonElement | null;
  const originalApplyHtml = applyBtn ? applyBtn.innerHTML : 'Apply Directly';

  try {
    state.isDownloading = true;
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.innerHTML = `
        <span class="btn-spinner" aria-hidden="true"></span>
        <span>Downloading...</span>
      `;
    }
    if (customizeBtn) customizeBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;

    updateDownloadProgress(true, 5, `Preparing ${item.name}...`);

    // Fully-automatic check for local copy in /sdcard/Download
    if (item.type === 'emoji') {
      const cleanName = item.name.replace(/[^a-zA-Z0-9]/g, '*');
      const patterns = [`*${cleanName}*.ttf`, `*${cleanName}*.otf`, `${item.id.replace(/^emoji-/, '')}*.ttf`];
      const localPath = await fontService.checkLocalDownload(patterns);
      if (localPath) {
        updateDownloadProgress(true, 100, `Found local file: ${localPath.split('/').pop()}`);
        showToast('Using local offline copy from Downloads');
        await new Promise((r) => setTimeout(r, 200));
        updateDownloadProgress(false);
        closePreviewSheet();

        await runApplyWorkflow({
          title: 'Apply Emoji Font?',
          body: `Install <strong>${escapeHtml(item.name)}</strong> (from local Downloads) across SystemUI and apps?<br><br>A device restart is required to reload system emojis.`,
          confirmText: 'Apply Emoji',
          iconType: 'apply',
          onApply: async (onProgress) => {
            await fontService.applyEmoji({
              emojiBuffer: new ArrayBuffer(0),
              emojiFile: null,
              emojiName: item.name,
              emojiSource: 'preset',
              localFilePath: localPath,
              onProgress
            });
          },
          onReboot: async () => {
            await fontService.reboot('soft');
          },
          onCancelReboot: () => {
            store.setState({ rebootRequired: true, rebootType: 'soft' });
            showToast('Reboot postponed. Restart anytime from the Overview tab.');
          }
        });
        return;
      }
    }

    const selectedVariant = variant || state.activeVariant || resolveVariant(item);
    const varVariant = getVariableVariant(item);
    const isVarSelected = isVariableVariant(selectedVariant);
    const downloadTarget = (isVarSelected && varVariant)
      ? varVariant
      : selectedVariant;

    const buffer = await downloadAndCacheFont(item, downloadTarget, (pct, msg) => {
      updateDownloadProgress(true, pct, msg);
    });

    state.cachedIds.add(item.id);
    updateDownloadProgress(true, 100, 'Verifying package payload...');

    // Small delay so user sees 100% completion inside modal before transition
    await new Promise((r) => setTimeout(r, 220));
    updateDownloadProgress(false);

    // Dismiss preview bottom sheet modal so the apply confirmation dialog is fully unobscured
    closePreviewSheet();

    if (item.type === 'emoji') {
      await runApplyWorkflow({
        title: 'Apply Emoji Font?',
        body: `Install <strong>${escapeHtml(item.name)}</strong> across SystemUI and apps?<br><br>A device restart is required to reload system emojis.`,
        confirmText: 'Apply Emoji',
        iconType: 'apply',
        onApply: async (onProgress) => {
          await fontService.applyEmoji({
            emojiBuffer: buffer,
            emojiFile: new File([buffer], `${item.name}.ttf`, { type: 'font/ttf' }),
            emojiName: item.name,
            emojiSource: 'preset',
            emojiUrl: selectedVariant.url || item.url,
            onProgress
          });
        },
        onReboot: async () => {
          store.setState({ rebootRequired: false, pendingEmoji: false });
          await fontService.reboot('soft');
        },
        onCancelReboot: () => {
          store.setState({ rebootRequired: true, rebootType: 'soft', pendingEmoji: true });
          showToast('Reboot postponed. Restart anytime from the Overview tab.');
        }
      });
    } else {
      const parsed = FontParser.parse(buffer);
      const isVariableFont = parsed.isVariable;
      const targetWeight = typeof selectedVariant.weight === 'number'
        ? selectedVariant.weight
        : parseInt(String(selectedVariant.weight), 10) || 400;

      // Axis values configured based on selected variant
      const axisValues: Record<string, number> = {};
      if (isVariableFont && !isVarSelected && targetWeight) {
        axisValues['wght'] = targetWeight;
      }

      const variantDisplay = isVarSelected
        ? 'Variable (100–900)'
        : (selectedVariant.name || `${targetWeight}`);

      await runApplyWorkflow({
        title: 'Apply Font',
        body: `Apply <strong>${escapeHtml(item.name)}</strong> (${escapeHtml(variantDisplay)}) across /system and /product partitions?<br><br>Original stock system fonts remain safely protected.`,
        confirmText: 'Apply Font',
        iconType: 'apply',
        onApply: async (onProgress) => {
          await fontService.applyFont({
            fontBuffer: buffer,
            fontFile: new File([buffer], `${item.name}.ttf`, { type: 'font/ttf' }),
            fontName: (item.name || parsed.familyName || parsed.fullName || 'Custom Font').trim(),
            isVariable: isVariableFont,
            weightMode: 'normal',
            axisValues,
            onProgress
          });
        },
        onReboot: async () => {
          store.setState({ rebootRequired: false, pendingFont: false });
          await fontService.reboot('soft');
        },
        onCancelReboot: () => {
          store.setState({ rebootRequired: true, rebootType: 'soft', pendingFont: true });
          showToast('Reboot postponed. Restart anytime from the Overview tab.');
        }
      });
    }
  } catch (err) {
    updateDownloadProgress(false);
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.innerHTML = originalApplyHtml;
    }
    if (customizeBtn) customizeBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Failed to apply ${item.name}: ${msg}`);
  } finally {
    state.isDownloading = false;
  }
}

export async function handleOpenInCustomize(item: BrowseItem, variant?: FontVariant): Promise<void> {
  const applyBtn = document.getElementById('btn-preview-apply') as HTMLButtonElement | null;
  const customizeBtn = document.getElementById('btn-preview-customize') as HTMLButtonElement | null;
  const deleteBtn = document.getElementById('btn-preview-delete') as HTMLButtonElement | null;
  const originalCustomizeHtml = customizeBtn ? customizeBtn.innerHTML : 'Open in Customize';

  try {
    state.isDownloading = true;
    if (customizeBtn) {
      customizeBtn.disabled = true;
      customizeBtn.innerHTML = `
        <span class="btn-spinner" aria-hidden="true"></span>
        <span>Downloading...</span>
      `;
    }
    if (applyBtn) applyBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;

    updateDownloadProgress(true, 5, `Preparing ${item.name}...`);

    const selectedVariant = variant || state.activeVariant || resolveVariant(item);
    const varVariant = getVariableVariant(item);
    const downloadTarget = (isVariableItem(item) && varVariant) ? varVariant : selectedVariant;
    const buffer = await downloadAndCacheFont(item, downloadTarget, (pct, msg) => {
      updateDownloadProgress(true, pct, msg);
    });
    state.cachedIds.add(item.id);
    updateDownloadProgress(true, 100, 'Parsing font tables...');

    const parsed = FontParser.parse(buffer);
    if (!parsed.valid) {
      updateDownloadProgress(false);
      if (customizeBtn) {
        customizeBtn.disabled = false;
        customizeBtn.innerHTML = originalCustomizeHtml;
      }
      if (applyBtn) applyBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
      showToast(parsed.error ? `Failed to parse font: ${parsed.error}` : 'Invalid font file.');
      return;
    }

    const {
      axisValues,
      selectedPreset: presetName,
      weightMode,
      targetWeight,
      isVarSelected
    } = deriveCustomizeSelection(parsed, selectedVariant);

    const file = new File([buffer], `${item.name}.ttf`, { type: 'font/ttf' });

    store.setState({
      fontFile: file,
      fontBuffer: buffer,
      fontData: parsed,
      axisValues,
      selectedPreset: presetName,
      weightMode
    });

    try {
      await FontEngine.loadFontFace('CustomImportedFont', buffer);
    } catch (_) {}

    updateDownloadProgress(false);
    closePreviewSheet();

    // Switch to customize tab
    navigateToTab('customize');

    const variantLabel = isVarSelected ? 'Variable' : `${targetWeight}`;
    showToast(`Opened "${item.name}" (${variantLabel}) in Customize`);
  } catch (err) {
    updateDownloadProgress(false);
    if (customizeBtn) {
      customizeBtn.disabled = false;
      customizeBtn.innerHTML = originalCustomizeHtml;
    }
    if (applyBtn) applyBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Failed to open in Customize: ${msg}`);
  } finally {
    state.isDownloading = false;
  }
}

function setupCreditsDialog(): void {
  const btnCredits = document.getElementById('btn-credits');
  const creditsDialog = document.getElementById('credits-dialog') as DialogLike | null;

  if (!btnCredits || !creditsDialog) return;

  btnCredits.addEventListener('click', () => {
    creditsDialog.show?.();
  });
}

export function setupBrowseTab(): void {
  const searchBar = document.getElementById('browse-search-bar');
  const searchInput = document.getElementById('browse-search-input') as HTMLInputElement | null;
  const filterBar = document.getElementById('browse-filter-bar');
  const gridContainer = document.getElementById('browse-grid');
  const viewBrowse = document.getElementById('view-browse');

  // 1. Search input with debouncing and <m3e-search-bar> clear event
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.query = val;
        refreshCatalogGrid(true);
      }, 200);
    });
  }

  if (searchBar) {
    searchBar.addEventListener('clear', () => {
      if (searchInput) searchInput.value = '';
      state.filters.query = '';
      refreshCatalogGrid(true);
    });
  }

  // 2. Connected Filter Bar ([All Fonts] [Variable] [Emojis]) + [Downloaded] chip
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement & { selected?: boolean }>('.browse-chip');
      if (!target) return;

      const filterType = target.getAttribute('data-filter');
      if (filterType === 'downloaded') {
        const currentlyActive = target.classList.contains('active');
        const nextState = !currentlyActive;
        target.classList.toggle('active', nextState);
        target.selected = nextState;
        if (nextState) {
          target.setAttribute?.('selected', '');
        } else {
          target.removeAttribute?.('selected');
        }
        target.setAttribute('aria-pressed', nextState ? 'true' : 'false');
        state.filters.downloadedOnly = nextState;
        refreshCatalogGrid(true);
        return;
      }

      // Single select among category filters: all-fonts, variable, emoji
      filterBar.querySelectorAll<HTMLElement & { selected?: boolean }>('.browse-chip:not([data-filter="downloaded"])').forEach((c) => {
        c.classList.remove('active');
        c.selected = false;
        c.removeAttribute?.('selected');
        c.setAttribute('aria-pressed', 'false');
      });

      target.classList.add('active');
      target.selected = true;
      target.setAttribute?.('selected', '');
      target.setAttribute('aria-pressed', 'true');

      if (filterType === 'variable') {
        state.filters.type = 'font';
        state.filters.source = 'all';
        state.filters.category = 'all';
        state.filters.isVariable = true;
      } else if (filterType === 'emoji') {
        state.filters.type = 'emoji';
        state.filters.source = 'all';
        state.filters.category = 'all';
        delete state.filters.isVariable;
      } else {
        state.filters.type = 'font';
        state.filters.source = 'all';
        state.filters.category = 'all';
        delete state.filters.isVariable;
      }

      refreshCatalogGrid(true);
    });
  }

  // 3. Card click / tap delegation -> open preview bottom sheet or delete download
  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      const deleteBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="delete"]');
      if (deleteBtn) {
        e.stopPropagation();
        const itemId = deleteBtn.getAttribute('data-id');
        if (itemId) {
          const item = getItemById(itemId);
          if (item) {
            handleDeleteCachedFont(item);
          }
        }
        return;
      }

      const card = (e.target as HTMLElement).closest<HTMLElement>('.browse-card');
      if (!card) return;

      const itemId = card.getAttribute('data-id');
      if (!itemId) return;

      const item = getItemById(itemId);
      if (item) {
        openPreviewSheet(item);
      }
    });

    gridContainer.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const deleteBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="delete"]');
        if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const itemId = deleteBtn.getAttribute('data-id');
          if (itemId) {
            const item = getItemById(itemId);
            if (item) {
              handleDeleteCachedFont(item);
            }
          }
          return;
        }

        const card = (e.target as HTMLElement).closest<HTMLElement>('.browse-card');
        if (!card) return;
        const itemId = card.getAttribute('data-id');
        if (!itemId) return;
        const item = getItemById(itemId);
        if (item) {
          e.preventDefault();
          openPreviewSheet(item);
        }
      }
    });
  }

  // 6. Infinite scroll chunking on scroll near bottom
  if (viewBrowse) {
    viewBrowse.addEventListener('scroll', () => {
      if (state.isLoading || state.displayedCount >= state.items.length) return;

      const scrollBottom = viewBrowse.scrollTop + viewBrowse.clientHeight;
      const scrollHeight = viewBrowse.scrollHeight;

      if (scrollHeight - scrollBottom < 300) {
        state.displayedCount += PAGE_SIZE;
        renderGridItems();
      }
    });
  }

  // 7. Credits dialog wiring
  setupCreditsDialog();

  // 8. Initial catalog render
  refreshCatalogGrid(true);

  // 9. Background online catalog synchronization (silent)
  syncOnlineCatalog().then(() => {
    // If online catalog discovered new items, refresh catalog view silently
    refreshCatalogGrid(false);
  }).catch(() => {
    // Bundled snapshot is always ready offline
  });
}
