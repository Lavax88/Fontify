/**
 * Fontify - Catalog Service
 * Provides in-memory multi-field search, category and facet filtering,
 * variant resolution for both Variable (wght axis) and static weights,
 * dynamic search against the Google Fonts directory when queries search outside bundled snapshot,
 * online catalog synchronization with zFont Host, and asset downloading.
 */

import type {
  BrowseItem,
  BrowseFilterState,
  BrowseContentType,
  FontVariant
} from './types';
import { BUNDLED_CATALOG } from './bundledCatalog';
import {
  getCachedFont,
  saveCachedFont,
  getAllCachedFontIds
} from './fontCache';

export const GOOGLE_FONTS_DIRECTORY_API = 'https://api.fontsource.org/v1/fonts';
const DEFAULT_SYNC_URL = 'https://raw.githubusercontent.com/zFont/Host/main/data.json';
const SYNCED_STORAGE_KEY = 'fontify_synced_catalog_v1';

// In-memory active catalog
let activeCatalog: BrowseItem[] = loadInitialCatalog();

// In-memory cache for remote Google Fonts directory
let cachedDirectoryList: any[] | null = null;

/**
 * Loads pre-bundled catalog and merges any previously cached online items from localStorage.
 */
function loadInitialCatalog(): BrowseItem[] {
  const base = [...BUNDLED_CATALOG];
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SYNCED_STORAGE_KEY);
      if (stored) {
        const extra = JSON.parse(stored) as BrowseItem[];
        if (Array.isArray(extra)) {
          const existingIds = new Set(base.map((b) => b.id));
          for (const item of extra) {
            if (!existingIds.has(item.id)) {
              base.push(item);
              existingIds.add(item.id);
            }
          }
        }
      }
    }
  } catch (_) {
    // Graceful fallback to bundled catalog
  }
  return base;
}

/**
 * Resets the active catalog to the default pre-bundled state (primarily for test isolation).
 */
export function resetCatalog(): void {
  activeCatalog = [...BUNDLED_CATALOG];
  cachedDirectoryList = null;
}

/**
 * Retrieves an item by its unique ID.
 */
export function getItemById(id: string): BrowseItem | undefined {
  return activeCatalog.find((item) => item.id === id);
}

/**
 * Resolves the best matching variant for a font family given target weight and style.
 * Supports both Variable fonts (continuous wght axis resolution) and static weights (closest distance).
 */
export function resolveVariant(
  item: BrowseItem,
  targetWeight?: number | string,
  targetStyle: 'normal' | 'italic' = 'normal'
): FontVariant {
  if (!item.variants || item.variants.length === 0) {
    return {
      name: 'Regular',
      weight: 400,
      style: targetStyle,
      url: item.url || '',
      isVariable: Boolean(item.isVariable),
      ...(item.isVariable ? { axisValues: { wght: 400 } } : {})
    };
  }

  if (targetWeight === undefined) {
    const defaultVariant =
      item.variants.find((v) => {
        const w = typeof v.weight === 'string' ? parseInt(v.weight, 10) : v.weight;
        return (w === 400 || v.name.toLowerCase().includes('regular')) && (v.style || 'normal') === targetStyle;
      }) || item.variants[0];

    return {
      ...defaultVariant,
      isVariable: Boolean(item.isVariable || defaultVariant.isVariable),
      ...(item.isVariable
        ? {
            axisValues: {
              wght: Number(defaultVariant.weight) || 400,
              ...(defaultVariant.axisValues || {})
            }
          }
        : {})
    };
  }

  const numericTarget = typeof targetWeight === 'string' ? parseInt(targetWeight, 10) : targetWeight;

  // 1. Exact match on weight and style
  const exact = item.variants.find((v) => {
    const vWeight = typeof v.weight === 'string' ? parseInt(v.weight, 10) : v.weight;
    const vStyle = v.style || 'normal';
    return vWeight === numericTarget && vStyle === targetStyle;
  });
  if (exact) {
    return {
      ...exact,
      isVariable: Boolean(item.isVariable || exact.isVariable),
      ...(item.isVariable
        ? {
            axisValues: {
              wght: numericTarget,
              ...(exact.axisValues || {})
            }
          }
        : {})
    };
  }

  // 2. Exact match on weight only
  const weightMatch = item.variants.find((v) => {
    const vWeight = typeof v.weight === 'string' ? parseInt(v.weight, 10) : v.weight;
    return vWeight === numericTarget;
  });
  if (weightMatch) {
    return {
      ...weightMatch,
      isVariable: Boolean(item.isVariable || weightMatch.isVariable),
      ...(item.isVariable
        ? {
            axisValues: {
              wght: numericTarget,
              ...(weightMatch.axisValues || {})
            }
          }
        : {})
    };
  }

  // 3. Variable Font Resolution: If font is variable with wght axis support
  if (item.isVariable && !isNaN(numericTarget)) {
    const minWeight =
      item.availableWeights && item.availableWeights.length > 0
        ? Math.min(...item.availableWeights)
        : 100;
    const maxWeight =
      item.availableWeights && item.availableWeights.length > 0
        ? Math.max(...item.availableWeights)
        : 900;
    const clampedWeight = Math.min(Math.max(numericTarget, minWeight), maxWeight);

    const baseVariant = item.variants.find((v) => v.isVariable) || item.variants[0];
    return {
      name: `${item.name} ${clampedWeight}`,
      weight: clampedWeight,
      style: targetStyle,
      url: baseVariant.url || item.url || '',
      sizeMb: baseVariant.sizeMb || item.sizeMb,
      isVariable: true,
      axisValues: {
        ...(baseVariant.axisValues || {}),
        wght: clampedWeight
      }
    };
  }

  // 4. Closest numerical weight distance for static fonts
  if (!isNaN(numericTarget)) {
    let closest = item.variants[0];
    let minDiff = Infinity;
    for (const v of item.variants) {
      const vWeight = typeof v.weight === 'string' ? parseInt(v.weight, 10) : v.weight;
      if (!isNaN(vWeight)) {
        const diff = Math.abs(vWeight - numericTarget);
        if (diff < minDiff) {
          minDiff = diff;
          closest = v;
        }
      }
    }
    return closest;
  }

  return item.variants[0];
}

/**
 * Internal filtering logic applied against a list of BrowseItems.
 */
function filterItemsInternal(
  items: BrowseItem[],
  filters?: Partial<BrowseFilterState>,
  cachedIds?: Set<string>
): BrowseItem[] {
  if (!filters) return items;

  let result = items;

  // 1. Filter by content type (font vs emoji)
  if (filters.type && filters.type !== 'all') {
    result = result.filter((item) => item.type === filters.type);
  }

  // 2. Filter by source (zfont vs google)
  if (filters.source && filters.source !== 'all') {
    result = result.filter((item) => item.source === filters.source);
  }

  // 3. Filter by category
  if (filters.category && filters.category !== 'all') {
    const catLower = filters.category.trim().toLowerCase();
    result = result.filter((item) => item.category.trim().toLowerCase() === catLower);
  }

  // 4. Filter by downloaded / cached status
  if (filters.downloadedOnly && cachedIds) {
    result = result.filter((item) => cachedIds.has(item.id));
  }

  // 5. Filter by variable font capability
  if (filters.isVariable !== undefined) {
    result = result.filter((item) => Boolean(item.isVariable) === filters.isVariable);
  }

  // 6. Multi-field text query search
  if (filters.query && filters.query.trim().length > 0) {
    const tokens = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    result = result.filter((item) => {
      const name = item.name.toLowerCase();
      const author = (item.author || '').toLowerCase();
      const category = item.category.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const tags = (item.tags || []).map((t) => t.toLowerCase()).join(' ');
      const source = item.source.toLowerCase();
      const type = item.type.toLowerCase();

      const combined = `${name} ${author} ${category} ${tags} ${desc} ${source} ${type}`;

      // Every search token must match somewhere in the item's searchable text
      return tokens.every((token) => combined.includes(token));
    });
  }

  return result;
}

/**
 * Normalizes a raw Google Fonts API or Fontsource entry into a Fontify BrowseItem.
 */
export function normalizeGoogleFontDirectoryItem(raw: {
  id: string;
  family: string;
  category: string;
  variable?: boolean;
  weights?: number[];
  styles?: string[];
  defSubset?: string;
}): BrowseItem {
  const categoryMap: Record<string, string> = {
    'sans-serif': 'Sans Serif',
    'serif': 'Serif',
    'display': 'Display',
    'handwriting': 'Handwriting',
    'monospace': 'Monospace'
  };

  const cleanCategory =
    categoryMap[raw.category?.toLowerCase()] ||
    (raw.category
      ? raw.category.charAt(0).toUpperCase() + raw.category.slice(1)
      : 'Sans Serif');

  const weights = raw.weights && raw.weights.length > 0 ? raw.weights : [400];
  const isVariable = Boolean(raw.variable);
  const slug = (raw.id || raw.family).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = `gf-${slug}`;

  const weightLabels: Record<number, string> = {
    100: 'Thin',
    200: 'ExtraLight',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'SemiBold',
    700: 'Bold',
    800: 'ExtraBold',
    900: 'Black'
  };

  const defaultWeight = weights.includes(400) ? 400 : weights[0];
  const defaultUrl = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-${defaultWeight}-normal.ttf`;

  const variants: FontVariant[] = weights.map((w) => ({
    name: `${weightLabels[w] || 'Weight'} ${w}`,
    weight: w,
    style: 'normal',
    url: `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-${w}-normal.ttf`,
    sizeMb: isVariable ? '0.3 MB' : '0.2 MB',
    isVariable,
    ...(isVariable ? { axisValues: { wght: w } } : {})
  }));

  const safeFamily = raw.family.replace(/'/g, "\\'");
  const svgThumb = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="70" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%231e1f22" rx="8"/><text x="16" y="42" fill="%23e3e3e3" font-family="'${safeFamily}', sans-serif" font-size="22" font-weight="500">${safeFamily}</text><text x="16" y="58" fill="%238e9196" font-family="sans-serif" font-size="10">${cleanCategory}</text></svg>`;

  return {
    id,
    name: raw.family,
    type: 'font',
    source: 'google',
    category: cleanCategory,
    author: 'Google Fonts',
    description: `${raw.family} open-source typeface family from the Google Fonts directory.`,
    previewText: 'Sphinx of black quartz, judge my vow.',
    thumbnailUrl: svgThumb,
    sizeMb: isVariable ? '0.3 MB' : '0.2 MB',
    url: defaultUrl,
    isVariable,
    variableAxes: isVariable ? ['wght'] : [],
    availableWeights: weights,
    weights,
    variants,
    tags: [
      'google',
      cleanCategory.toLowerCase(),
      ...raw.family.toLowerCase().split(/\s+/),
      ...(isVariable ? ['variable'] : [])
    ]
  };
}

/**
 * Searches the online Google Fonts / Fontsource directory for font families.
 * Tries direct family fetch first, followed by filtering the online directory list.
 */
export async function searchGoogleFontsDirectory(
  query: string,
  apiUrl = GOOGLE_FONTS_DIRECTORY_API
): Promise<BrowseItem[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  try {
    // 1. Try direct exact family lookup first (e.g. /fonts/{slug})
    try {
      const directRes = await fetch(`${apiUrl}/${slug}`);
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData && directData.family) {
          const item = normalizeGoogleFontDirectoryItem(directData);
          return [item];
        }
      }
    } catch (_) {
      // Fall through to directory list search
    }

    // 2. Fetch or reuse directory list
    if (!cachedDirectoryList) {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cachedDirectoryList = data;
        } else if (data && Array.isArray((data as any).value)) {
          cachedDirectoryList = (data as any).value;
        }
      }
    }

    if (!cachedDirectoryList || cachedDirectoryList.length === 0) {
      return [];
    }

    // Filter directory list by query tokens
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const matches = cachedDirectoryList.filter((f) => {
      const fam = (f.family || f.id || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      return tokens.every((tok) => fam.includes(tok) || cat.includes(tok));
    });

    return matches.slice(0, 30).map((m) => normalizeGoogleFontDirectoryItem(m));
  } catch (err) {
    console.warn('[CatalogService] Google Fonts directory search failed:', err);
    return [];
  }
}

/**
 * Asynchronous item search and retrieval with support for downloaded status lookup,
 * plus dynamic search against Google Fonts directory when queries search outside the bundled snapshot.
 */
export async function getItems(filters?: Partial<BrowseFilterState>): Promise<BrowseItem[]> {
  let cachedIds: Set<string> | undefined;

  if (filters?.downloadedOnly) {
    const ids = await getAllCachedFontIds();
    cachedIds = new Set(ids);
  }

  // 1. Initial filter against in-memory active catalog
  let results = filterItemsInternal(activeCatalog, filters, cachedIds);

  // 2. Dynamic search against Google Fonts directory when a query searches outside bundled snapshot
  const query = filters?.query?.trim();
  const allowGoogle = !filters?.source || filters.source === 'all' || filters.source === 'google';
  const allowFont = !filters?.type || filters.type === 'all' || filters.type === 'font';

  if (query && allowGoogle && allowFont && !filters?.downloadedOnly) {
    const hasGoogleMatches = results.some((item) => item.source === 'google');
    if (!hasGoogleMatches) {
      try {
        const dynamicItems = await searchGoogleFontsDirectory(query);
        if (dynamicItems.length > 0) {
          const existingIds = new Set(activeCatalog.map((i) => i.id));
          for (const item of dynamicItems) {
            if (!existingIds.has(item.id)) {
              activeCatalog.push(item);
              existingIds.add(item.id);
            }
          }
          results = filterItemsInternal(activeCatalog, filters, cachedIds);
        }
      } catch (_) {
        // Fall back gracefully to local results
      }
    }
  }

  return results;
}

/**
 * Synchronous fast-path filter helper when downloaded state is not required.
 */
export function getItemsSync(filters?: Partial<BrowseFilterState>): BrowseItem[] {
  return filterItemsInternal(activeCatalog, filters);
}

/**
 * Retrieves all unique categories available for the specified content type.
 */
export function getCategories(type?: BrowseContentType | 'all'): string[] {
  const filtered =
    type && type !== 'all' ? activeCatalog.filter((item) => item.type === type) : activeCatalog;

  const categories = new Set<string>();
  for (const item of filtered) {
    if (item.category) {
      categories.add(item.category);
    }
  }

  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

/**
 * Raw data schema from zFont data.json
 */
interface ZFontCategoryRaw {
  name: string;
  items?: Array<{
    n: string;
    s?: number;
    t?: string;
    a?: string;
    f: string;
    al?: string;
    p?: string;
    c?: string;
  }>;
}

interface ZFontDataJson {
  update?: unknown;
  slider?: unknown[];
  categories?: ZFontCategoryRaw[];
}

/**
 * Normalizes a raw zFont item into a Fontify BrowseItem.
 */
function normalizeZFontItem(categoryName: string, raw: NonNullable<ZFontCategoryRaw['items']>[number]): BrowseItem {
  const isEmoji = categoryName.toLowerCase() === 'emoji';
  const cleanCategory = isEmoji ? 'Emoji' : categoryName;
  const rawName = raw.n || 'Unnamed Font';
  const displayName = rawName.replace(/_/g, ' ');

  const idSlug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = isEmoji ? `emoji-zf-${idSlug}` : `zf-${idSlug}`;

  const hostBase = 'https://raw.githubusercontent.com/zFont/Host/main';
  const cdnHostBase = 'https://cdn.jsdelivr.net/gh/zFont/Host@main';
  const url = raw.f.startsWith('http')
    ? raw.f
    : `${hostBase}${raw.f.startsWith('/') ? '' : '/'}${raw.f}`;

  const thumbnailUrl = raw.t
    ? raw.t.startsWith('http')
      ? raw.t.replace('https://raw.githubusercontent.com/zFont/Host/main/', `${cdnHostBase}/`)
      : `${cdnHostBase}${raw.t.startsWith('/') ? '' : '/'}${raw.t}`
    : undefined;

  const sizeMb = raw.s ? `${(raw.s / (1024 * 1024)).toFixed(1)} MB` : undefined;

  return {
    id,
    name: displayName,
    type: isEmoji ? 'emoji' : 'font',
    source: 'zfont',
    category: cleanCategory,
    author: raw.a || 'zFont Archive',
    url,
    thumbnailUrl,
    sizeMb,
    isColorFont: cleanCategory.toLowerCase() === 'color',
    variants: [
      {
        name: 'Regular',
        weight: 400,
        url,
        sizeMb
      }
    ],
    tags: [
      cleanCategory.toLowerCase(),
      'zfont',
      ...(raw.a ? [raw.a.toLowerCase()] : []),
      ...displayName.toLowerCase().split(/\s+/)
    ],
    description: `${displayName} from zFont (${cleanCategory})${raw.a ? ` by ${raw.a}` : ''}.`
  };
}

/**
 * Fetches the online catalog manifest from zFont Host and updates the in-memory catalog and cache.
 */
export async function syncOnlineCatalog(syncUrl = DEFAULT_SYNC_URL): Promise<BrowseItem[]> {
  try {
    const res = await fetch(syncUrl, {
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      console.warn(`[CatalogService] Online catalog sync returned status ${res.status}`);
      return activeCatalog;
    }

    const data = (await res.json()) as ZFontDataJson;
    if (!data || !Array.isArray(data.categories)) {
      return activeCatalog;
    }

    const existingIds = new Set(activeCatalog.map((item) => item.id));
    const newItems: BrowseItem[] = [];

    for (const cat of data.categories) {
      if (!cat.name || !Array.isArray(cat.items)) continue;

      for (const raw of cat.items) {
        if (!raw.f || !raw.n) continue;
        const normalized = normalizeZFontItem(cat.name, raw);

        if (!existingIds.has(normalized.id)) {
          existingIds.add(normalized.id);
          newItems.push(normalized);
        }
      }
    }

    if (newItems.length > 0) {
      activeCatalog = [...activeCatalog, ...newItems];

      // Cache the synced items into localStorage for offline persistence
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SYNCED_STORAGE_KEY, JSON.stringify(newItems));
        }
      } catch (_) {
        // Ignored if storage quota exceeded or unavailable
      }
    }

    return activeCatalog;
  } catch (err) {
    console.warn('[CatalogService] Failed to sync online catalog, keeping bundled catalog:', err);
    return activeCatalog;
  }
}

/**
 * Downloads a font or emoji binary, checks the cache first, and saves to IndexedDB upon fetch.
 */
export async function downloadAndCacheFont(
  item: BrowseItem,
  variant?: FontVariant
): Promise<ArrayBuffer> {
  const cached = await getCachedFont(item.id);
  if (cached && cached.buffer && cached.buffer.byteLength > 0) {
    return cached.buffer;
  }

  const selectedVariant = variant || resolveVariant(item);
  const downloadUrl = selectedVariant.url || item.url;
  if (!downloadUrl) {
    throw new Error(`Item ${item.name} (${item.id}) does not have a valid download URL.`);
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${item.name}: HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await saveCachedFont(item.id, item, buffer);

  return buffer;
}
