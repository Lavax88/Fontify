/**
 * Fontify - Deep Browse Controller
 * Owns catalog filtering, pagination, cache state, active preview selection,
 * and Google Fonts CSS2 subset URL construction independently of DOM hosts.
 */

import { getItems } from './catalogService';
import { getAllCachedFontIds, deleteCachedFont } from './fontCache';
import { isVariableItem, resolveVariant } from '../font/variants';
import type { BrowseFilterState, BrowseItem, FontVariant } from './types';

export const PAGE_SIZE = 24;
export const SUBSET_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?\'"-/()[]{}@#%&*+=_';

export function buildSubsetText(item: BrowseItem, extraText = ''): string {
  const combined = `${SUBSET_CHARS}${item.name}${item.previewText || ''}${extraText}`;
  return Array.from(new Set(combined.split(''))).filter(c => c !== '\n' && c !== '\r').join('');
}

export function buildGoogleFontsCssUrl(
  item: BrowseItem,
  specimenText = ''
): { primaryUrl: string; fallbackUrl: string } {
  const familyParam = encodeURIComponent(item.name).replace(/%20/g, '+');
  const subsetText = buildSubsetText(item, specimenText);
  const availableWeights =
    item.availableWeights && item.availableWeights.length > 0
      ? item.availableWeights
      : item.weights && item.weights.length > 0
      ? item.weights
      : [400];

  const isVar = isVariableItem(item);
  let wghtSpec = '';
  if (isVar) {
    const minW = Math.min(...availableWeights);
    const maxW = Math.max(...availableWeights);
    wghtSpec = minW < maxW ? `wght@${minW}..${maxW}` : `wght@${minW}`;
  } else {
    wghtSpec = `wght@${availableWeights.join(';')}`;
  }

  return {
    primaryUrl: `https://fonts.googleapis.com/css2?family=${familyParam}:${wghtSpec}&display=swap&text=${encodeURIComponent(subsetText)}`,
    fallbackUrl: `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`
  };
}

export interface BrowseState {
  filters: Partial<BrowseFilterState>;
  items: BrowseItem[];
  cachedIds: Set<string>;
  displayedCount: number;
  activeItem: BrowseItem | null;
  activeVariant: FontVariant | null;
  isLoading: boolean;
  isDownloading: boolean;
}

export class BrowseController {
  public readonly state: BrowseState = {
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

  public async refresh(resetPaging = false): Promise<BrowseItem[]> {
    this.state.isLoading = true;
    if (resetPaging) {
      this.state.displayedCount = PAGE_SIZE;
    }

    try {
      let [matchingItems, cachedIdList] = await Promise.all([
        getItems(this.state.filters),
        getAllCachedFontIds()
      ]);

      if (this.state.filters.isVariable) {
        matchingItems = matchingItems.filter(item => isVariableItem(item));
      }

      this.state.items = matchingItems;
      this.state.cachedIds = new Set(cachedIdList);
      return matchingItems;
    } finally {
      this.state.isLoading = false;
    }
  }

  public setCategoryFilter(filterType: 'all-fonts' | 'variable' | 'emoji'): void {
    this.state.filters.source = 'all';
    this.state.filters.category = 'all';
    if (filterType === 'variable') {
      this.state.filters.type = 'font';
      this.state.filters.isVariable = true;
    } else if (filterType === 'emoji') {
      this.state.filters.type = 'emoji';
      delete this.state.filters.isVariable;
    } else {
      this.state.filters.type = 'font';
      delete this.state.filters.isVariable;
    }
  }

  public loadMore(): boolean {
    if (this.state.isLoading || this.state.displayedCount >= this.state.items.length) {
      return false;
    }
    this.state.displayedCount += PAGE_SIZE;
    return true;
  }

  public openPreview(item: BrowseItem, defaultVariant?: FontVariant): void {
    this.state.activeItem = item;
    this.state.activeVariant = defaultVariant || resolveVariant(item);
  }

  public closePreview(): void {
    this.state.activeItem = null;
    this.state.activeVariant = null;
  }

  public async deleteCached(itemId: string): Promise<void> {
    await deleteCachedFont(itemId);
    this.state.cachedIds.delete(itemId);
    if (this.state.filters.downloadedOnly) {
      this.state.items = this.state.items.filter(i => i.id !== itemId);
      if (this.state.activeItem?.id === itemId) {
        this.closePreview();
      }
    }
  }
}
