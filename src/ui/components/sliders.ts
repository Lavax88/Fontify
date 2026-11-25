/**
 * Fontify - Variable Font Weight & Style Preset Chips (<m3e-filter-chip-set>) & Axis Sliders (<m3e-slider>)
 */

import type { FontInfo } from '../../font/types';
import { FontEngine } from '../../font/engine';
import { store } from '../../state/store';

type FilterChipLike = HTMLElement & {
  selected?: boolean;
  value?: string;
};

type FilterChipSetLike = HTMLElement & {
  selected?: readonly FilterChipLike[];
};

type SliderThumbLike = HTMLElement & {
  value: number | null;
};

type SliderLike = HTMLElement & {
  thumb?: SliderThumbLike | null;
};

interface PresetOption {
  name: string;
  values: Record<string, number | string>;
}

function setActiveChip(chips: NodeListOf<FilterChipLike> | FilterChipLike[], activeChip: FilterChipLike | null): void {
  chips.forEach(c => {
    const isActive = c === activeChip;
    c.selected = isActive;
    if (isActive) {
      c.setAttribute('selected', '');
    } else {
      c.removeAttribute('selected');
    }
    c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function updateSliderValue(tag: string, val: number): void {
  const slider = document.getElementById(`slider-${tag}`) as SliderLike | null;
  const thumb = slider?.querySelector('m3e-slider-thumb') as SliderThumbLike | null;
  const badge = document.getElementById(`badge-${tag}`);

  if (thumb) {
    thumb.value = val;
    thumb.setAttribute('value', String(val));
  }
  if (slider) {
    slider.setAttribute('aria-valuenow', String(val));
  }
  if (badge) {
    badge.textContent = String(val);
  }
}

export function renderVariableControls(
  fontData: FontInfo,
  previewElements: (HTMLElement | null)[]
): void {
  const variableControlsGroup = document.getElementById('variable-controls-group');
  const slidersContainer = document.getElementById('sliders-container');
  const presetsContainer = document.getElementById('presets-container');
  const stylePresetsSection = document.getElementById('style-presets-section');
  const stylePresetsContainer = document.getElementById('style-presets-container');

  if (!variableControlsGroup || !slidersContainer || !presetsContainer) return;

  variableControlsGroup.style.display = 'block';
  slidersContainer.innerHTML = '';
  presetsContainer.innerHTML = '';
  if (stylePresetsContainer) stylePresetsContainer.innerHTML = '';

  const currentStoreAxes = store.getState().axisValues || {};
  const initialAxisValues: Record<string, number> = {};
  for (const axis of fontData.axes) {
    initialAxisValues[axis.tag] = currentStoreAxes[axis.tag] ?? axis.default;
  }
  store.setState({
    axisValues: initialAxisValues,
    weightMode: store.getState().weightMode || 'auto'
  });

  // 1. Build Weight Presets
  const weightPresets: PresetOption[] = [
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

  // 2. Build Style Presets from named fvar instances or slant/italic axes
  const stylePresets: PresetOption[] = [];
  if (fontData.instances && fontData.instances.length > 0) {
    for (const inst of fontData.instances) {
      stylePresets.push({ name: inst.name, values: inst.values });
    }
  } else {
    const italAxis = fontData.axes.find(a => a.tag === 'ital');
    const slntAxis = fontData.axes.find(a => a.tag === 'slnt');
    if (italAxis) {
      stylePresets.push({ name: 'Roman', values: { ital: italAxis.min } });
      stylePresets.push({ name: 'Italic', values: { ital: italAxis.max } });
    } else if (slntAxis) {
      stylePresets.push({ name: 'Upright', values: { slnt: 0 } });
      stylePresets.push({ name: 'Slanted', values: { slnt: slntAxis.min < 0 ? slntAxis.min : slntAxis.max } });
    }
  }

  const selectedPresetFromStore = store.getState().selectedPreset;

  const weightChipSet = document.createElement('m3e-filter-chip-set') as FilterChipSetLike;
  weightChipSet.setAttribute('aria-label', 'Font weight presets');

  const styleChipSet = document.createElement('m3e-filter-chip-set') as FilterChipSetLike;
  styleChipSet.setAttribute('aria-label', 'Font style presets');

  const applyPreset = (preset: PresetOption) => {
    const nextAxisValues = { ...store.getState().axisValues };

    if (preset.values.mode === 'auto') {
      store.setState({ weightMode: 'auto', selectedPreset: preset.name });
      for (const axis of fontData.axes) {
        nextAxisValues[axis.tag] = axis.default;
        updateSliderValue(axis.tag, axis.default);
      }
    } else {
      store.setState({ weightMode: 'custom', selectedPreset: preset.name });
      for (const [tag, val] of Object.entries(preset.values)) {
        if (typeof val === 'number') {
          nextAxisValues[tag] = val;
          updateSliderValue(tag, val);
        }
      }
    }

    store.setState({ axisValues: nextAxisValues });
    FontEngine.scheduleVariationUpdate(previewElements, nextAxisValues);
  };

  let matchedWeightIdx = -1;
  if (selectedPresetFromStore) {
    matchedWeightIdx = weightPresets.findIndex(p => p.name.toLowerCase() === selectedPresetFromStore.toLowerCase());
  }
  if (matchedWeightIdx === -1 && initialAxisValues['wght'] !== undefined) {
    matchedWeightIdx = weightPresets.findIndex(p => p.values.wght === initialAxisValues['wght']);
  }
  if (matchedWeightIdx === -1 && stylePresets.length === 0) {
    matchedWeightIdx = 0;
  }

  weightPresets.forEach((preset, idx) => {
    const isInitialActive = idx === matchedWeightIdx;
    const chip = document.createElement('m3e-filter-chip') as FilterChipLike;
    chip.className = 'm3-chip';
    chip.textContent = preset.name;
    chip.value = preset.name;
    chip.selected = isInitialActive;
    if (isInitialActive) chip.setAttribute('selected', '');
    chip.setAttribute('aria-pressed', isInitialActive ? 'true' : 'false');
    weightChipSet.appendChild(chip);
  });

  // Listen to M3E 'change' (fires after M3E's internal click toggle completes) so selection stays highlighted
  weightChipSet.addEventListener('change', () => {
    const selectedChip = weightChipSet.selected?.[0] ?? weightChipSet.querySelector<FilterChipLike>('m3e-filter-chip[selected]');
    const preset = selectedChip ? weightPresets.find(p => p.name === selectedChip.value) : undefined;
    if (preset && selectedChip) {
      setActiveChip(weightChipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), selectedChip);
      setActiveChip(styleChipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), null);
      applyPreset(preset);
    }
  });

  presetsContainer.appendChild(weightChipSet);

  if (stylePresetsSection && stylePresetsContainer) {
    if (stylePresets.length > 0) {
      stylePresetsSection.style.display = 'block';
      let matchedStyleIdx = -1;
      if (selectedPresetFromStore) {
        matchedStyleIdx = stylePresets.findIndex(p => p.name.toLowerCase() === selectedPresetFromStore.toLowerCase());
      }

      stylePresets.forEach((preset, idx) => {
        const isInitialActive = idx === matchedStyleIdx;
        const chip = document.createElement('m3e-filter-chip') as FilterChipLike;
        chip.className = 'm3-chip';
        chip.textContent = preset.name;
        chip.value = preset.name;
        chip.selected = isInitialActive;
        if (isInitialActive) chip.setAttribute('selected', '');
        chip.setAttribute('aria-pressed', isInitialActive ? 'true' : 'false');
        styleChipSet.appendChild(chip);
      });

      styleChipSet.addEventListener('change', () => {
        const selectedChip = styleChipSet.selected?.[0] ?? styleChipSet.querySelector<FilterChipLike>('m3e-filter-chip[selected]');
        const preset = selectedChip ? stylePresets.find(p => p.name === selectedChip.value) : undefined;
        if (preset && selectedChip) {
          setActiveChip(styleChipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), selectedChip);
          setActiveChip(weightChipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), null);
          applyPreset(preset);
        }
      });

      stylePresetsContainer.appendChild(styleChipSet);
    } else {
      stylePresetsSection.style.display = 'none';
    }
  }

  // 3. Build M3E Expressive Sliders (<m3e-slider size="medium" labelled>)
  for (const axis of fontData.axes) {
    const currentVal = initialAxisValues[axis.tag] ?? axis.default;
    const step = axis.max - axis.min > 100 ? 10 : 1;

    const unit = document.createElement('div');
    unit.className = 'slider-unit-box';
    unit.innerHTML = `
      <div class="slider-top">
        <label class="axis-name" for="slider-${axis.tag}">${axis.name} (${axis.tag})</label>
        <span class="axis-val-chip" id="badge-${axis.tag}" aria-hidden="true">${currentVal}</span>
      </div>
      <m3e-slider id="slider-${axis.tag}" size="medium" labelled min="${axis.min}" max="${axis.max}" step="${step}" aria-label="${axis.name} (${axis.tag})" aria-valuemin="${axis.min}" aria-valuemax="${axis.max}" aria-valuenow="${currentVal}">
        <m3e-slider-thumb value="${currentVal}"></m3e-slider-thumb>
      </m3e-slider>
    `;

    const slider = unit.querySelector('m3e-slider') as SliderLike | null;
    const thumb = unit.querySelector('m3e-slider-thumb') as SliderThumbLike | null;
    const badge = unit.querySelector('.axis-val-chip');

    if (slider && thumb && badge) {
      const handleSliderChange = () => {
        const raw = thumb.value ?? Number(thumb.getAttribute('value') ?? currentVal);
        const val = Number.isFinite(raw) ? raw : currentVal;
        badge.textContent = String(val);
        slider.setAttribute('aria-valuenow', String(val));

        const currentAxes = { ...store.getState().axisValues, [axis.tag]: val };
        store.setState({ axisValues: currentAxes, weightMode: 'custom', selectedPreset: 'Custom' });

        setActiveChip(weightChipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), null);
        setActiveChip(styleChipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), null);
        FontEngine.scheduleVariationUpdate(previewElements, currentAxes);
      };

      slider.addEventListener('input', handleSliderChange);
      slider.addEventListener('change', handleSliderChange);
    }

    slidersContainer.appendChild(unit);
  }

  FontEngine.scheduleVariationUpdate(previewElements, initialAxisValues);
}
