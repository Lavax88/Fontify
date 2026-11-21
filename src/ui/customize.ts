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
      await fontService.reboot('soft');
    },
    onCancelReboot: () => {
      store.setState({ rebootRequired: true, rebootType: 'soft' });
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

  // 2. Sync Customize UI from Store State (Single Source of Truth)
  function syncCustomizeUIFromStore(): void {
    const state = store.getState();
    const fontData = state.fontData;

    if (!fontData || !fontData.valid) {
      if (fontInfoRow) fontInfoRow.style.display = 'none';
      if (variableControlsGroup) variableControlsGroup.style.display = 'none';
      if (state.status.active) {
        if (pickerTitle) pickerTitle.textContent = `${state.status.active_font_name} (Active)`;
        if (pickerSubtitle) pickerSubtitle.textContent = 'Custom font applied. Tap or drop any font to customize.';
      } else {
        if (pickerTitle) pickerTitle.textContent = 'Import Font File';
        if (pickerSubtitle) pickerSubtitle.textContent = 'Tap to select or drop any .ttf or .otf font';
      }
      if (btnApply) btnApply.disabled = true;
      return;
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

    // Render variable sliders and preset chips if font is variable
    if (fontData.isVariable) {
      if (fontTypeBadge) fontTypeBadge.textContent = 'Variable';
      if (variableControlsGroup) variableControlsGroup.style.display = 'flex';
      renderVariableControls(fontData, previewElements);
    } else {
      if (fontTypeBadge) fontTypeBadge.textContent = 'Static';
      if (variableControlsGroup) variableControlsGroup.style.display = 'none';
      FontEngine.scheduleVariationUpdate(previewElements, {});
    }

    if (btnApply) btnApply.disabled = false;

    // Load font face asynchronously for live preview specimen rendering
    if (state.fontBuffer) {
      FontEngine.loadFontFace('CustomImportedFont', state.fontBuffer).catch((err) => {
        console.error('FontFace registration error:', err);
      });
    }
  }

  // Subscribe to store updates for fontData and tab changes
  store.subscribe(s => s.fontData, () => {
    syncCustomizeUIFromStore();
  });

  store.subscribe(s => s.currentTab, (tab) => {
    if (tab === 'customize') {
      syncCustomizeUIFromStore();
    }
  });

  // Initial check on startup
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
      await syncCustomizeUIFromStore();
    };

    reader.readAsArrayBuffer(file);
  }

  // 4. Fallback handlers for legacy buttons if present
  if (btnApply) {
    btnApply.addEventListener('click', applySelectedFont);
  }
  if (btnRestore) {
    btnRestore.addEventListener('click', restoreStockFont);
  }
  if (btnSoftReboot) {
    btnSoftReboot.addEventListener('click', async () => {
      const isFull = store.getState().rebootType === 'full';
      if (isFull) {
        await showConfirmDialog({
          title: 'Full Reboot Required',
          body: 'A full device reboot is required to cleanly restore stock system fonts and prevent bootloops.<br><br>Reboot now?',
          confirmText: 'Full Reboot',
          cancelText: 'Cancel',
          iconType: 'reboot',
          onConfirm: () => fontService.fullReboot()
        });
      } else {
        await showConfirmDialog({
          title: 'Reboot Device',
          body: 'Restart system to load updated fonts?',
          confirmText: 'Reboot',
          cancelText: 'Cancel',
          iconType: 'reboot',
          onConfirm: () => fontService.reboot('soft')
        });
      }
    });
  }
}
