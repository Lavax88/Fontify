/**
 * Fontify - Font Variant, Weight & Preset Domain Module
 * Consolidates canonical weight labels, variable font detection, variant resolution,
 * and Customize axis/preset derivation into one in-process module.
 */

import type { BrowseItem, FontVariant } from '../browse/types';
import type { FontInfo } from './types';

export const CANONICAL_WEIGHT_LABELS: Record<number, string> = {
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

export interface AxisPresetOption {
  name: string;
  values: Record<string, number | string>;
}

export const WEIGHT_PRESETS: AxisPresetOption[] = [
  { name: 'Auto (Stock)', values: { mode: 'auto' } },
  { name: 'Thin (100)', values: { wght: 100 } },
  { name: 'Light (300)', values: { wght: 300 } },
  { name: 'Regular (400)', values: { wght: 400 } },
  { name: 'Medium (500)', values: { wght: 500 } },
  { name: 'SemiBold (600)', values: { wght: 600 } },
  { name: 'Bold (700)', values: { wght: 700 } },
  { name: 'ExtraBold (800)', values: { wght: 800 } },
  { name: 'Black (900)', values: { wght: 900 } }
];

export function getWeightLabel(weight: number | string, fallbackName?: string): string {
  const num = typeof weight === 'number' ? weight : parseInt(String(weight), 10);
  if (num && CANONICAL_WEIGHT_LABELS[num]) {
    return CANONICAL_WEIGHT_LABELS[num];
  }
  if (fallbackName && isNaN(Number(fallbackName))) {
    return fallbackName.replace(/\s*\d+$/, '');
  }
  return num ? `Weight ${num}` : (fallbackName || 'Regular');
}

export function isVariableVariant(variant?: Partial<FontVariant> | null): boolean {
  if (!variant) return false;
  return Boolean(
    variant.isVariable ||
    variant.weight === '100-900' ||
    String(variant.weight ?? '').includes('100-900') ||
    String(variant.weight ?? '').includes('..') ||
    variant.weight === 'variable' ||
    variant.name?.toLowerCase().includes('variable')
  );
}

export function isVariableItem(item: BrowseItem): boolean {
  return Boolean(
    item.isVariable ||
    item.tags?.includes('variable') ||
    item.variants?.some(v => isVariableVariant(v))
  );
}

export function getVariableVariant(item: BrowseItem): FontVariant | null {
  if (!isVariableItem(item)) return null;
  const existing = item.variants?.find(v => isVariableVariant(v));
  if (existing && existing.url) {
    return existing;
  }
  const varUrl = item.variableUrl || (item.isVariable ? item.url : '') || (item.variants?.[0]?.url || '');
  return {
    name: 'Variable (100–900)',
    weight: '100-900',
    style: 'normal',
    url: varUrl,
    sizeMb: '0.8 MB',
    isVariable: true
  };
}

export function getStaticVariants(item: BrowseItem): FontVariant[] {
  const isVar = isVariableItem(item);
  let statics = (item.variants || []).filter(v => !isVariableVariant(v));

  if (isVar && statics.length === 0) {
    const weights = [100, 300, 400, 500, 700, 900];
    statics = weights.map(w => ({
      name: getWeightLabel(w),
      weight: w,
      style: 'normal',
      url: item.url || item.variants?.[0]?.url || ''
    }));
  }

  return statics;
}

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
      item.variants.find(v => {
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

  const exact = item.variants.find(v => {
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

  const weightMatch = item.variants.find(v => {
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

    const baseVariant = item.variants.find(v => v.isVariable) || item.variants[0];
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

export function deriveCustomizeSelection(
  fontData: FontInfo,
  selectedVariant?: FontVariant | null
): {
  axisValues: Record<string, number>;
  selectedPreset: string;
  weightMode: 'auto' | 'custom' | 'normal';
  targetWeight: number;
  isVarSelected: boolean;
} {
  const isVarSelected = isVariableVariant(selectedVariant);
  const targetWeight = selectedVariant
    ? (typeof selectedVariant.weight === 'number'
        ? selectedVariant.weight
        : parseInt(String(selectedVariant.weight), 10) || 400)
    : 400;

  const axisValues: Record<string, number> = {};
  let selectedPreset = 'Auto (Stock)';
  let weightMode: 'auto' | 'custom' | 'normal' = 'auto';

  if (fontData.isVariable) {
    if (!isVarSelected && selectedVariant && targetWeight) {
      axisValues['wght'] = targetWeight;
      weightMode = 'custom';
      const label = CANONICAL_WEIGHT_LABELS[targetWeight];
      selectedPreset = label ? `${label} (${targetWeight})` : `${targetWeight}`;
    } else {
      axisValues['wght'] = 400;
      selectedPreset = 'Auto (Stock)';
      weightMode = 'auto';
    }
  }

  return { axisValues, selectedPreset, weightMode, targetWeight, isVarSelected };
}

export function buildStylePresets(fontData: FontInfo): AxisPresetOption[] {
  const stylePresets: AxisPresetOption[] = [];
  if (fontData.instances && fontData.instances.length > 0) {
    for (const inst of fontData.instances) {
      stylePresets.push({ name: inst.name, values: inst.values });
    }
    return stylePresets;
  }

  const italAxis = fontData.axes.find(a => a.tag === 'ital');
  const slntAxis = fontData.axes.find(a => a.tag === 'slnt');
  if (italAxis) {
    stylePresets.push({ name: 'Roman', values: { ital: italAxis.min } });
    stylePresets.push({ name: 'Italic', values: { ital: italAxis.max } });
  } else if (slntAxis) {
    stylePresets.push({ name: 'Upright', values: { slnt: 0 } });
    stylePresets.push({ name: 'Slanted', values: { slnt: slntAxis.min < 0 ? slntAxis.min : slntAxis.max } });
  }
  return stylePresets;
}

export function resolveAppliedFontName(fontData: FontInfo): string {
  return (fontData.familyName || fontData.fullName || 'Custom Font').trim();
}
