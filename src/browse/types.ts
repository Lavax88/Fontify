/**
 * Fontify - Browse Section Data Contracts
 * Defines types for the font & emoji catalog, variants, filtering, and cache entries.
 */

export type BrowseContentType = 'font' | 'emoji';
export type BrowseSource = 'zfont' | 'google';

export interface FontVariant {
  name: string;
  weight: number | string;
  style?: 'normal' | 'italic';
  url: string;
  sizeMb?: string;
  isVariable?: boolean;
  axisValues?: Record<string, number>;
}

export interface BrowseItem {
  id: string;
  name: string;
  type: BrowseContentType;
  source: BrowseSource;
  category: string;
  author?: string;
  previewText?: string;
  description?: string;
  thumbnailUrl?: string;
  isVariable?: boolean;
  variableAxes?: string[];
  variableUrl?: string;
  availableWeights?: number[];
  weights?: number[];
  variants: FontVariant[];
  url?: string;
  sizeMb?: string;
  tags?: string[];
  isColorFont?: boolean;
}

export interface BrowseFilterState {
  query?: string;
  type?: BrowseContentType | 'all';
  source?: BrowseSource | 'all';
  category?: string;
  downloadedOnly?: boolean;
  isVariable?: boolean;
}

export interface CachedFontEntry {
  id: string;
  item: BrowseItem;
  buffer: ArrayBuffer;
  size: number;
  cachedAt: number;
}
