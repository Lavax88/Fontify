/**
 * Fontify - Variable Font Preset Chips (<m3e-filter-chip-set>) & Axis Sliders (<m3e-slider>)
 */

import type { FontInfo } from '../../font/types';
import { FontEngine } from '../../font/engine';
import { store } from '../../state/store';

type FilterChipLike = HTMLElement & {
  selected?: boolean;
  value?: string;
};

type SliderThumbLike = HTMLElement & {
  value: number | null;
};

type SliderLike = HTMLElement & {
  thumb?: SliderThumbLike | null;
};

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

  if (!variableControlsGroup || !slidersContainer || !presetsContainer) return;

  variableControlsGroup.style.display = 'block';
  slidersContainer.innerHTML = '';
  presetsContainer.innerHTML = '';

  const currentStoreAxes = store.getState().axisValues || {};
  const initialAxisValues: Record<string, number> = {};
  for (const axis of fontData.axes) {
    initialAxisValues[axis.tag] = currentStoreAxes[axis.tag] ?? axis.default;
  }
  store.setState({
    axisValues: initialAxisValues,
    weightMode: store.getState().weightMode || 'auto'
  });

  // 1. Build Presets inside <m3e-filter-chip-set>
  const presets: { name: string; values: Record<string, number | string> }[] = [
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

  if (fontData.instances && fontData.instances.length > 0) {
    for (const inst of fontData.instances) {
      presets.push({ name: inst.name, values: inst.values });
    }
  }

  const selectedPresetFromStore = store.getState().selectedPreset;
  let matchedPresetIndex = -1;
  if (selectedPresetFromStore) {
    matchedPresetIndex = presets.findIndex(p => p.name.toLowerCase() === selectedPresetFromStore.toLowerCase());
  }
  if (matchedPresetIndex === -1 && initialAxisValues['wght'] !== undefined) {
    matchedPresetIndex = presets.findIndex(p => p.values.wght === initialAxisValues['wght']);
  }
  if (matchedPresetIndex === -1) {
    matchedPresetIndex = 0;
  }

  const chipSet = document.createElement('m3e-filter-chip-set');
  chipSet.setAttribute('aria-label', 'Font variation presets');

  presets.forEach((preset, idx) => {
    const isInitialActive = idx === matchedPresetIndex;
    const chip = document.createElement('m3e-filter-chip') as FilterChipLike;
    chip.className = 'm3-chip';
    chip.textContent = preset.name;
    chip.value = preset.name;
    chip.selected = isInitialActive;
    if (isInitialActive) {
      chip.setAttribute('selected', '');
    }
    chip.setAttribute('aria-pressed', isInitialActive ? 'true' : 'false');

    chip.addEventListener('click', () => {
      setActiveChip(chipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), chip);

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
    });

    chipSet.appendChild(chip);
  });

  presetsContainer.appendChild(chipSet);

  // 2. Build M3E Expressive Sliders (<m3e-slider size="medium" labelled>)
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

        setActiveChip(chipSet.querySelectorAll<FilterChipLike>('m3e-filter-chip'), null);
        FontEngine.scheduleVariationUpdate(previewElements, currentAxes);
      };

      slider.addEventListener('input', handleSliderChange);
      slider.addEventListener('change', handleSliderChange);
    }

    slidersContainer.appendChild(unit);
  }

  FontEngine.scheduleVariationUpdate(previewElements, initialAxisValues);
}
