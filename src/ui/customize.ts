/**
 * Fontify - Customize Tab Controller (M3E Expressive)
 * Handles font file import, font parsing, variable controls, live preview,
 * Apply Font, and Revert actions.
 */

import { store } from '../state/store';
import { FontParser } from '../font/parser';
import { FontEngine } from '../font/engine';
import { fontService } from '../bridge/service';
import { showToast } from './components/toast';
import { showConfirmDialog, runApplyWorkflow } from './components/dialog';
import { renderVariableControls } from './components/sliders';

import type { FontInfo } from '../font/types';

export function resolveAppliedFontName(
  fontData: FontInfo,
  selectedPreset: string,
  weightMode: string,
  axisValues: Record<string, number>
): string {
  if (!fontData.isVariable) {
    return fontData.fullName;
  }

  const family = (fontData.familyName || fontData.fullName || 'Custom Font').trim();
  const preset = (selectedPreset || '').trim();

  if (preset && preset !== 'Custom' && preset !== 'Auto (Stock)') {
    // Normalize "Regular (400)" -> "Regular" while keeping named styles like "Regular" or "Bold Italic"
    const cleanPreset = preset.replace(/\s*\(\d+\)\s*$/, '').trim();
    if (cleanPreset.toLowerCase().startsWith(family.toLowerCase())) {
      return cleanPreset;
    }
    return `${family} ${cleanPreset}`.trim();
  }

  if (weightMode === 'auto' || preset === 'Auto (Stock)') {
    return `${family} (Variable)`;
  }

  if (preset === 'Custom' && typeof axisValues?.wght === 'number') {
    return `${family} (wght ${axisValues.wght})`;
  }

  return fontData.fullName;
}

export async function applySelectedFont(): Promise<void> {
  const state = store.getState();
  if (!state.fontBuffer || !state.fontData) {
    showToast('Please select a font file first.');
    return;
  }

  const resolvedFontName = resolveAppliedFontName(
    state.fontData,
    state.selectedPreset,
    state.weightMode,
    state.axisValues
  );

  await runApplyWorkflow({
    title: 'Apply Font',
    body: `Apply <strong>${resolvedFontName}</strong> across /system and /product partitions?<br><br>Original stock system fonts remain safely protected.`,
    confirmText: 'Apply Font',
    iconType: 'apply',
    onApply: async (onProgress) => {
      await fontService.applyFont({
        fontBuffer: state.fontBuffer!,
        fontFile: state.fontFile,
        fontName: resolvedFontName,
        isVariable: state.fontData!.isVariable,
        weightMode: state.weightMode,
        axisValues: state.axisValues,
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

export async function restoreStockFont(): Promise<void> {
  const confirmed = await showConfirmDialog({
    title: 'Revert to Stock',
    body: 'Remove custom font overlays and restore original stock system font?',
    confirmText: 'Revert',
    iconType: 'revert'
  });

  if (!confirmed) return;

  showToast('Reverting to stock font...');
  try {
    await fontService.restoreStock();
    store.setState({ rebootRequired: true, rebootType: 'full' });

    const rebootConfirmed = await showConfirmDialog({
      title: 'Full Reboot Required',
      body: 'Stock fonts have been restored. A <strong>full device reboot</strong> is required to safely unmount system overlays and prevent bootloops.<br><br>Reboot now?',
      confirmText: 'Full Reboot',
      cancelText: 'Later',
      iconType: 'reboot'
    });

    if (rebootConfirmed) {
      await fontService.fullReboot();
    } else {
      showToast('Full reboot postponed. Restart anytime from the Overview tab.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Restore failed: ${msg}`);
  }
}

export function setupCustomizeTab(): void {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  const btnSelectFile = document.getElementById('btn-select-file');
  const pickerTitle = document.getElementById('picker-title');
  const pickerSubtitle = document.getElementById('picker-subtitle');

  const fontInfoRow = document.getElementById('font-info-row');
  const fontNameElem = document.getElementById('font-name');
  const fontFormatElem = document.getElementById('font-format');
  const fontTypeBadge = document.getElementById('font-type-badge');
  const variableControlsGroup = document.getElementById('variable-controls-group');

  const previewElements = Array.from(document.querySelectorAll<HTMLElement>('.preview-text'));

  // 1. File Selection Handlers
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', e => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    dropzone.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        processSelectedFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener('click', e => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        processSelectedFile(target.files[0]);
      }
    });
  }

  // 2. Sync Customize UI from Store State
  function syncCustomizeUIFromStore(): void {
    const state = store.getState();
    const fontData = state.fontData;

    if (!fontData || !fontData.valid) {
      if (fontInfoRow) fontInfoRow.style.display = 'none';
      if (variableControlsGroup) variableControlsGroup.style.display = 'none';
      if (state.status.active) {
        if (pickerTitle) pickerTitle.textContent = `${state.status.active_font_name} (Active)`;
        if (pickerSubtitle) {
          pickerSubtitle.textContent = '';
          if (pickerSubtitle.style) pickerSubtitle.style.display = 'none';
        }
      } else {
        if (pickerTitle) pickerTitle.textContent = 'Import Font File';
        if (pickerSubtitle) {
          pickerSubtitle.textContent = '';
          if (pickerSubtitle.style) pickerSubtitle.style.display = 'none';
        }
      }
      return;
    }

    if (pickerTitle) pickerTitle.textContent = fontData.fullName;
    if (pickerSubtitle) {
      pickerSubtitle.textContent = `${fontData.format} (${fontData.numGlyphs || 0} glyphs)`;
      if (pickerSubtitle.style) pickerSubtitle.style.display = 'block';
    }

    if (fontInfoRow) fontInfoRow.style.display = 'flex';
    if (fontNameElem) fontNameElem.textContent = fontData.fullName;
    if (fontFormatElem) {
      const ver = fontData.version ? (fontData.version.toLowerCase().startsWith('v') ? fontData.version : `v${fontData.version}`) : 'v1.0';
      fontFormatElem.textContent = `${fontData.format} ${ver}`;
    }

    if (fontData.isVariable) {
      if (fontTypeBadge) fontTypeBadge.textContent = 'Variable';
      if (variableControlsGroup) variableControlsGroup.style.display = 'block';
      renderVariableControls(fontData, previewElements);
    } else {
      if (fontTypeBadge) fontTypeBadge.textContent = 'Static';
      if (variableControlsGroup) variableControlsGroup.style.display = 'none';
      FontEngine.scheduleVariationUpdate(previewElements, {});
    }

    if (state.fontBuffer) {
      FontEngine.loadFontFace('CustomImportedFont', state.fontBuffer).catch((err) => {
        console.error('FontFace registration error:', err);
      });
    }
  }

  store.subscribe(s => s.fontData, () => {
    syncCustomizeUIFromStore();
  });

  store.subscribe(s => s.currentTab, (tab) => {
    if (tab === 'customize') {
      syncCustomizeUIFromStore();
    }
  });

  syncCustomizeUIFromStore();

  // 3. Process Imported Font File
  function processSelectedFile(file: File): void {
    const reader = new FileReader();

    reader.onload = async event => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      const fontData = FontParser.parse(buffer);
      if (!fontData.valid) {
        showToast(fontData.error ? `Failed to parse font: ${fontData.error}` : 'Failed to parse font. Ensure it is a valid TTF/OTF font.');
        return;
      }

      store.setState({
        fontFile: file,
        fontBuffer: buffer,
        fontData,
        selectedPreset: '',
        weightMode: 'normal'
      });

      showToast(`Loaded "${fontData.fullName}"`);
      syncCustomizeUIFromStore();
    };

    reader.readAsArrayBuffer(file);
  }
}
