/**
 * Fontify - Customize Tab Controller
 * Handles font file import, font parsing, variable controls, live preview,
 * Apply Font, Revert, and Reboot actions.
 */

import { store } from '../state/store';
import { FontParser } from '../font/parser';
import { FontEngine } from '../font/engine';
import { fontService } from '../bridge/service';
import { showToast } from './components/toast';
import { showConfirmDialog, runApplyWorkflow } from './components/dialog';
import { renderVariableControls } from './components/sliders';

export async function applySelectedFont(): Promise<void> {
  const state = store.getState();
  if (!state.fontBuffer || !state.fontData) {
    showToast('Please select a font file first.');
    return;
  }

  await runApplyWorkflow({
    title: 'Apply Font',
    body: `Apply <strong>${state.fontData.fullName}</strong> across /system and /product partitions?<br><br>Original stock system fonts remain safely protected.`,
    confirmText: 'Apply Font',
    iconType: 'apply',
    onApply: async (onProgress) => {
      await fontService.applyFont({
        fontBuffer: state.fontBuffer!,
        fontFile: state.fontFile,
        fontName: state.fontData!.fullName,
        isVariable: state.fontData!.isVariable,
        weightMode: state.weightMode,
        axisValues: state.axisValues,
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
    store.setState({ rebootRequired: true });
    showToast('Stock fonts restored! Restart device to apply.');
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

  const btnApply = document.getElementById('btn-apply') as HTMLButtonElement | null;
  const btnRestore = document.getElementById('btn-restore') as HTMLButtonElement | null;
  const btnSoftReboot = document.getElementById('btn-soft-reboot') as HTMLButtonElement | null;

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

  // 2. Process Imported Font File
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
        fontData
      });

      try {
        await FontEngine.loadFontFace('CustomImportedFont', buffer);
        FontEngine.scheduleVariationUpdate(previewElements, store.getState().axisValues);
        showToast(`Loaded "${fontData.fullName}"`);
      } catch (err) {
        console.error('FontFace registration error:', err);
      }

      // Update Picker Card State
      if (pickerTitle) pickerTitle.textContent = fontData.fullName;
      if (pickerSubtitle) {
        pickerSubtitle.textContent = `${fontData.format} (${fontData.numGlyphs || 0} glyphs)`;
      }

      // Update Font Info Row
      if (fontInfoRow) fontInfoRow.style.display = 'flex';
      if (fontNameElem) fontNameElem.textContent = fontData.fullName;
      if (fontFormatElem) {
        const ver = fontData.version ? (fontData.version.toLowerCase().startsWith('v') ? fontData.version : `v${fontData.version}`) : 'v1.0';
        fontFormatElem.textContent = `${fontData.format} ${ver}`;
      }

      if (fontData.isVariable) {
        if (fontTypeBadge) fontTypeBadge.textContent = 'Variable';
        renderVariableControls(fontData, previewElements);
      } else {
        if (fontTypeBadge) fontTypeBadge.textContent = 'Static';
        if (variableControlsGroup) variableControlsGroup.style.display = 'none';
        store.setState({ axisValues: {}, weightMode: 'auto' });
        FontEngine.scheduleVariationUpdate(previewElements, {});
      }

      if (btnApply) btnApply.disabled = false;
    };

    reader.readAsArrayBuffer(file);
  }

  // 3. Fallback handlers for legacy buttons if present
  if (btnApply) {
    btnApply.addEventListener('click', applySelectedFont);
  }
  if (btnRestore) {
    btnRestore.addEventListener('click', restoreStockFont);
  }
  if (btnSoftReboot) {
    btnSoftReboot.addEventListener('click', async () => {
      await showConfirmDialog({
        title: 'Reboot Device',
        body: 'Restart system to load updated fonts?',
        confirmText: 'Reboot',
        iconType: 'reboot',
        onConfirm: () => fontService.reboot()
      });
    });
  }
}
