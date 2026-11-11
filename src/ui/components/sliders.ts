/**
 * Fontify - Variable Font Preset Chips & Axis Sliders Component
 */

import type { FontInfo } from '../../font/types';
import { FontEngine } from '../../font/engine';
import { store } from '../../state/store';

function setActiveChip(chips: NodeListOf<HTMLButtonElement> | HTMLButtonElement[], activeChip: HTMLButtonElement | null): void {
  chips.forEach(c => {
    const isActive = c === activeChip;
    c.classList.toggle('active', isActive);
    c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

export function renderVariableControls(
  fontData: FontInfo,
  previewElements: (HTMLElement | null)[]
): void {
  const variableControlsGroup = document.getElementById('variable-controls-group');
  const slidersContainer = document.getElementById('sliders-container');
  const presetsContainer = document.getElementById('presets-container');

  if (!variableControlsGroup || !slidersContainer || !presetsContainer) return;

  variableControlsGroup.style.display = 'flex';
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

  // 1. Build Presets
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

  presets.forEach((preset, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `m3-chip ${idx === 0 ? 'active' : ''}`;
    chip.textContent = preset.name;
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');

    chip.addEventListener('click', () => {
      setActiveChip(presetsContainer.querySelectorAll<HTMLButtonElement>('.m3-chip'), chip);

      const nextAxisValues = { ...store.getState().axisValues };

      if (preset.values.mode === 'auto') {
        store.setState({ weightMode: 'auto', selectedPreset: preset.name });
        for (const axis of fontData.axes) {
          nextAxisValues[axis.tag] = axis.default;
          const slider = document.getElementById(`slider-${axis.tag}`) as HTMLInputElement | null;
          const badge = document.getElementById(`badge-${axis.tag}`);
          if (slider) {
            slider.value = String(axis.default);
            slider.setAttribute('aria-valuenow', String(axis.default));
          }
          if (badge) badge.textContent = String(axis.default);
        }
      } else {
        store.setState({ weightMode: 'custom', selectedPreset: preset.name });
        for (const [tag, val] of Object.entries(preset.values)) {
          if (typeof val === 'number') {
            nextAxisValues[tag] = val;
            const slider = document.getElementById(`slider-${tag}`) as HTMLInputElement | null;
            const badge = document.getElementById(`badge-${tag}`);
            if (slider) {
              slider.value = String(val);
              slider.setAttribute('aria-valuenow', String(val));
            }
            if (badge) badge.textContent = String(val);
          }
        }
      }

      store.setState({ axisValues: nextAxisValues });
      FontEngine.scheduleVariationUpdate(previewElements, nextAxisValues);
    });

    presetsContainer.appendChild(chip);
  });

  // 2. Build Sliders
  for (const axis of fontData.axes) {
    const currentVal = initialAxisValues[axis.tag] ?? axis.default;
    const unit = document.createElement('div');
    unit.className = 'slider-unit-box';
    unit.innerHTML = `
      <div class="slider-top">
        <label class="axis-name" for="slider-${axis.tag}">${axis.name} (${axis.tag})</label>
        <span class="axis-val-chip" id="badge-${axis.tag}" aria-hidden="true">${currentVal}</span>
      </div>
      <input type="range" id="slider-${axis.tag}" min="${axis.min}" max="${axis.max}" step="${
      axis.max - axis.min > 100 ? 10 : 1
    }" value="${currentVal}" aria-label="${axis.name} (${axis.tag})" aria-valuemin="${axis.min}" aria-valuemax="${axis.max}" aria-valuenow="${currentVal}">
    `;

    const slider = unit.querySelector('input') as HTMLInputElement | null;
    const badge = unit.querySelector('.axis-val-chip');

    if (slider && badge) {
      slider.addEventListener('input', (e: Event) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        badge.textContent = String(val);
        slider.setAttribute('aria-valuenow', String(val));

        const currentAxes = { ...store.getState().axisValues, [axis.tag]: val };
        store.setState({ axisValues: currentAxes, weightMode: 'custom', selectedPreset: 'Custom' });

        setActiveChip(presetsContainer.querySelectorAll<HTMLButtonElement>('.m3-chip'), null);
        FontEngine.scheduleVariationUpdate(previewElements, currentAxes);
      });
    }

    slidersContainer.appendChild(unit);
  }
}
