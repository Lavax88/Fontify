/**
 * Fontify - Customize Tab Controller
 * Handles font file import, font parsing, variable controls, live preview,
 * Apply Font, Revert, and Reboot actions.
 */

import { store } from '../state/store';
import { saveCachedStatus } from '../state/cache';
import { FontParser } from '../font/parser';
import { FontEngine } from '../font/engine';
import { applyFont, restoreStock, rebootDevice } from '../bridge/scripts';
import { showToast } from './components/toast';
import { showConfirmDialog } from './components/dialog';
import { renderVariableControls } from './components/sliders';

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
        pickerSubtitle.textContent = `${fontData.format} • ${fontData.numGlyphs || 0} Glyphs`;
      }

      // Update Font Info Row
      if (fontInfoRow) fontInfoRow.style.display = 'flex';
      if (fontNameElem) fontNameElem.textContent = fontData.fullName;
      if (fontFormatElem) {
        fontFormatElem.textContent = `${fontData.format} • ${fontData.version || 'v1.0'}`;
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

  // 3. Apply Font Action
  if (btnApply) {
    btnApply.addEventListener('click', async () => {
      const state = store.getState();
      if (!state.fontBuffer || !state.fontData) {
        showToast('Please select a font file first.');
        return;
      }

      const confirmed = await showConfirmDialog({
        title: 'Apply Font',
        body: `Apply <strong>${state.fontData.fullName}</strong> across /system and /product partitions?<br><br>Original stock system fonts remain completely intact.`,
        confirmText: 'Apply Font',
        iconType: 'apply'
      });

      if (!confirmed) return;

      btnApply.disabled = true;
      store.setState({ isApplying: true });
      showToast('Preparing font overlay...', 2000);

      try {
        const actionResult = await applyFont({
          fontBuffer: state.fontBuffer,
          fontFile: state.fontFile,
          fontName: state.fontData.fullName,
          isVariable: state.fontData.isVariable,
          weightMode: state.weightMode,
          axisValues: state.axisValues,
          onProgress: (percent, msg) => {
            store.setState({ applyProgress: percent, applyProgressMessage: msg });
            if (percent > 0 && percent % 25 === 0) {
              showToast(msg, 1200);
            }
          }
        });

        if (!actionResult.success) {
          throw new Error(actionResult.error || actionResult.message || 'Apply script reported failure.');
        }

        // Cache update
        saveCachedStatus(true, state.fontData.fullName, state.status.device);

        // State update
        store.setState({
          status: {
            ...state.status,
            active: true,
            active_font_name: state.fontData.fullName
          }
        });

        await showConfirmDialog({
          title: 'Font Applied',
          body: `<strong>${state.fontData.fullName}</strong> overlay staged successfully!<br><br>Reboot your device to activate the new fonts across all applications:`,
          confirmText: 'Reboot Now',
          iconType: 'reboot',
          onConfirm: () => rebootDevice()
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Apply Font Error:', err);
        showToast(`Apply failed: ${msg}`);
      } finally {
        btnApply.disabled = false;
        store.setState({ isApplying: false });
      }
    });
  }

  // 4. Revert to Stock Action
  if (btnRestore) {
    btnRestore.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'Revert to Stock',
        body: 'Remove custom font overlays and restore original stock system font?',
        confirmText: 'Revert',
        iconType: 'revert'
      });

      if (!confirmed) return;

      showToast('Reverting to stock font...');
      try {
        const result = await restoreStock();
        if (!result.success) {
          throw new Error(result.error || result.message || 'Restore script reported failure.');
        }

        const state = store.getState();
        saveCachedStatus(false, 'Roboto / Google Sans', state.status.device);

        store.setState({
          status: {
            ...state.status,
            active: false,
            active_font_name: 'Roboto / Google Sans'
          }
        });

        await showConfirmDialog({
          title: 'Stock Restored',
          body: 'Stock font configuration restored.<br><br>Reboot device to reload stock fonts:',
          confirmText: 'Reboot Now',
          iconType: 'reboot',
          onConfirm: () => rebootDevice()
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Restore Stock Error:', err);
        showToast(`Revert failed: ${msg}`);
      }
    });
  }

  // 5. Reboot Action
  if (btnSoftReboot) {
    btnSoftReboot.addEventListener('click', async () => {
      await showConfirmDialog({
        title: 'Reboot',
        body: 'Restart device to reload system fonts?',
        confirmText: 'Reboot',
        iconType: 'reboot',
        onConfirm: () => rebootDevice()
      });
    });
  }
}
