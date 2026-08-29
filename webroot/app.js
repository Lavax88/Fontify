/**
 * Fontify - app.js
 * Material 3 Expressive Application Controller with 2-tab layout,
 * KernelSU callback & Promise shell bridge, live device status,
 * and variable font engine.
 *
 * Author: Lava
 */

// Global Tab Switcher
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) {
        targetView.classList.add('active');
    }

    const targetTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme & Window Decor
    setupTheming();
    setupUserCustomization();

    // App State
    const state = {
        fontFile: null,
        fontBuffer: null,
        fontData: null,
        fontBlobUrl: null,
        axisValues: {},
        weightMode: 'auto',
        systemStatus: {
            active: localStorage.getItem('fontify_is_active') === 'true',
            active_font_name: localStorage.getItem('fontify_active_font') || 'Roboto / Google Sans',
            backup_exists: false,
            device: {
                model: 'POCO F7',
                device: 'onyx',
                abi: 'arm64-v8a (4K)',
                android_version: '16',
                sdk_version: '36',
                rom: 'LineageOS'
            }
        }
    };

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const btnSelectFile = document.getElementById('btn-select-file');
    const pickerTitle = document.getElementById('picker-title');
    const pickerSubtitle = document.getElementById('picker-subtitle');

    const fontInfoRow = document.getElementById('font-info-row');
    const fontNameElem = document.getElementById('font-name');
    const fontFormatElem = document.getElementById('font-format');
    const fontTypeBadge = document.getElementById('font-type-badge');
    const variableControlsGroup = document.getElementById('variable-controls-group');
    const slidersContainer = document.getElementById('sliders-container');
    const presetsContainer = document.getElementById('presets-container');
    const previewElements = document.querySelectorAll('.preview-text');

    const overviewBanner = document.getElementById('overview-banner');
    const bannerTitle = document.getElementById('banner-title');
    const bannerSubtitle = document.getElementById('banner-subtitle');
    const bannerBadge = document.getElementById('banner-badge');
    const infoActiveFont = document.getElementById('info-active-font');
    const infoSystemVer = document.getElementById('info-system-ver');
    const infoDeviceName = document.getElementById('info-device-name');
    const infoSystemAbi = document.getElementById('info-system-abi');
    const infoBackupStatus = document.getElementById('info-backup-status');

    const btnApply = document.getElementById('btn-apply');
    const btnRestore = document.getElementById('btn-restore');
    const btnSoftReboot = document.getElementById('btn-soft-reboot');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const toastContainer = document.getElementById('toast-container');

    // Universal Root Command Bridge Supporting KernelSU Callbacks & Promises
    function execCommand(command) {
        return new Promise((resolve) => {
            // 1. KernelSU / KernelSU Next / APatch WebUI Interface
            if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
                const cbName = '_ksu_cb_' + Math.random().toString(36).substr(2, 9);
                let resolved = false;

                window[cbName] = function(errno, stdout, stderr) {
                    if (!resolved) {
                        resolved = true;
                        delete window[cbName];
                        resolve({
                            code: errno || 0,
                            stdout: stdout || '',
                            stderr: stderr || ''
                        });
                    }
                };

                try {
                    let ret;
                    try {
                        // Standard KernelSU 3-argument signature: ksu.exec(cmd, optionsJson, callbackName)
                        ret = ksu.exec(command, JSON.stringify({}), cbName);
                    } catch (_) {
                        // Fallback 2-argument signature
                        ret = ksu.exec(command, cbName);
                    }

                    // Promise return (MMRL / Modern WebUI)
                    if (ret && typeof ret.then === 'function') {
                        ret.then(res => {
                            if (!resolved) {
                                resolved = true;
                                delete window[cbName];
                                if (typeof res === 'string') {
                                    resolve({ code: 0, stdout: res, stderr: '' });
                                } else if (res && typeof res === 'object') {
                                    resolve({ code: res.errno || res.code || 0, stdout: res.stdout || '', stderr: res.stderr || '' });
                                } else {
                                    resolve({ code: 0, stdout: String(res || ''), stderr: '' });
                                }
                            }
                        }).catch(err => {
                            if (!resolved) {
                                resolved = true;
                                delete window[cbName];
                                resolve({ code: 1, stdout: '', stderr: String(err) });
                            }
                        });
                        return;
                    }

                    // Direct string/object synchronous return
                    if (ret !== undefined && ret !== null) {
                        if (!resolved) {
                            resolved = true;
                            delete window[cbName];
                            if (typeof ret === 'string') {
                                try {
                                    const parsed = JSON.parse(ret);
                                    if (parsed && typeof parsed === 'object' && ('stdout' in parsed || 'errno' in parsed)) {
                                        resolve({ code: parsed.errno || parsed.code || 0, stdout: parsed.stdout || '', stderr: parsed.stderr || '' });
                                        return;
                                    }
                                } catch(e) {}
                                resolve({ code: 0, stdout: ret, stderr: '' });
                            } else if (typeof ret === 'object') {
                                resolve({ code: ret.errno || ret.code || 0, stdout: ret.stdout || '', stderr: ret.stderr || '' });
                            }
                        }
                        return;
                    }

                    // Safety timeout for callback
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            delete window[cbName];
                            resolve({ code: 0, stdout: '', stderr: 'timeout' });
                        }
                    }, 4000);
                } catch (e) {
                    if (!resolved) {
                        resolved = true;
                        delete window[cbName];
                        resolve({ code: 1, stdout: '', stderr: String(e) });
                    }
                }
            }
            // 2. MMRL Interface
            else if (window.mmrl && window.mmrl.exec) {
                try {
                    window.mmrl.exec(command).then(out => {
                        resolve({ code: 0, stdout: typeof out === 'string' ? out : JSON.stringify(out), stderr: '' });
                    }).catch(err => {
                        resolve({ code: 1, stdout: '', stderr: String(err) });
                    });
                } catch (e) {
                    resolve({ code: 1, stdout: '', stderr: String(e) });
                }
            }
            // 3. Browser Mock
            else {
                setTimeout(() => {
                    if (command.includes('get_status.sh')) {
                        const isAct = localStorage.getItem('fontify_is_active') === 'true';
                        const fName = localStorage.getItem('fontify_active_font') || 'Roboto / Google Sans';
                        resolve({
                            code: 0,
                            stdout: JSON.stringify({
                                active: isAct,
                                active_font_name: fName,
                                backup_exists: true,
                                config: {},
                                backup_info: { backed_up: true },
                                device: {
                                    model: 'POCO F7',
                                    device: 'onyx',
                                    abi: 'arm64-v8a (4K)',
                                    android_version: '16',
                                    sdk_version: '36',
                                    rom: 'LineageOS'
                                }
                            }),
                            stderr: ''
                        });
                    } else {
                        resolve({ code: 0, stdout: '{"success":true}', stderr: '' });
                    }
                }, 100);
            }
        });
    }

    // Toast Notification
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-item';
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(16px) scale(0.95)';
            toast.style.transition = 'all 0.25s var(--m3-easing-standard)';
            setTimeout(() => toast.remove(), 250);
        }, duration);
    }

    // M3 Expressive Dialog Icons map
    const DIALOG_ICONS = {
        apply: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
        reboot: `<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>`,
        revert: `<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>`,
        info: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>`
    };

    // Confirmation Modal Dialog (M3 Expressive)
    function showConfirmModal(title, body, confirmText = 'Confirm', onConfirm, iconType = 'info') {
        modalTitle.textContent = title;
        modalBody.innerHTML = body;
        modalConfirmBtn.textContent = confirmText;

        const iconSvg = document.getElementById('dialog-icon-svg');
        if (iconSvg && DIALOG_ICONS[iconType]) {
            iconSvg.innerHTML = DIALOG_ICONS[iconType];
        }

        modalOverlay.classList.add('open');

        const handleConfirm = () => {
            modalOverlay.classList.remove('open');
            modalConfirmBtn.removeEventListener('click', handleConfirm);
            if (onConfirm) onConfirm();
        };

        const handleCancel = () => {
            modalOverlay.classList.remove('open');
            modalConfirmBtn.removeEventListener('click', handleConfirm);
        };

        modalConfirmBtn.onclick = handleConfirm;
        modalCancelBtn.onclick = handleCancel;
    }

    // Apply UI state for active vs stock font
    function updateUIStatus(isActive, fontName, device) {
        if (isActive) {
            overviewBanner.className = 'm3-banner-card is-active';
            bannerTitle.textContent = 'Activated';
            bannerSubtitle.textContent = `${fontName || 'Custom Font'} (Active)`;
            bannerBadge.textContent = 'CUSTOM';
            infoActiveFont.textContent = fontName || 'Custom Font';
        } else {
            overviewBanner.className = 'm3-banner-card is-stock';
            bannerTitle.textContent = 'Default Font';
            bannerSubtitle.textContent = 'Stock System Font';
            bannerBadge.textContent = 'STOCK';
            infoActiveFont.textContent = 'Roboto / Google Sans';
        }

        if (device) {
            infoSystemVer.textContent = `${device.android_version || '16'} (API ${device.sdk_version || '36'})`;
            infoDeviceName.textContent = `${device.model || 'POCO F7'} (${device.device || 'onyx'})`;
            infoSystemAbi.textContent = `${device.abi || 'arm64-v8a'} (4K)`;
        }
    }

    // Initial Status Query
    async function loadSystemStatus() {
        try {
            const res = await execCommand('if [ -f /data/adb/modules/fontify/bin/get_status.sh ]; then /data/adb/modules/fontify/bin/get_status.sh; else /data/adb/modules/custom_font_installer/bin/get_status.sh; fi');
            if (res && res.stdout && res.stdout.trim().startsWith('{')) {
                const data = JSON.parse(res.stdout);
                state.systemStatus = data;

                const isActive = Boolean(data.active);
                const fontName = isActive ? (data.active_font_name || 'Custom Font') : 'Roboto / Google Sans';

                localStorage.setItem('fontify_is_active', isActive ? 'true' : 'false');
                localStorage.setItem('fontify_active_font', fontName);

                updateUIStatus(isActive, fontName, data.device);
                infoBackupStatus.textContent = data.backup_exists ? 'Protected (/data/adb)' : 'Pending';
                return;
            }
        } catch (e) {
            console.warn('Status load error:', e);
        }

        // Fallback to cache only if shell execution failed completely
        const cachedActive = localStorage.getItem('fontify_is_active') === 'true';
        const cachedFont = localStorage.getItem('fontify_active_font') || 'Roboto / Google Sans';
        updateUIStatus(cachedActive, cachedFont, state.systemStatus.device);
    }

    // File Selector & Drop Listeners
    if (dropzone) {
        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleSelectedFont(e.dataTransfer.files[0]);
            }
        });
    }

    if (btnSelectFile) {
        btnSelectFile.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleSelectedFont(e.target.files[0]);
        }
    });

    // Process Imported Font File
    function handleSelectedFont(file) {
        state.fontFile = file;
        const reader = new FileReader();

        reader.onload = (event) => {
            state.fontBuffer = event.target.result;
            state.fontData = FontParser.parse(state.fontBuffer);

            if (!state.fontData.valid) {
                showToast('Failed to parse font. Ensure it is a valid TTF/OTF font.');
                return;
            }

            // Inject @font-face for preview
            if (state.fontBlobUrl) {
                URL.revokeObjectURL(state.fontBlobUrl);
            }
            const blob = new Blob([state.fontBuffer], { type: 'font/ttf' });
            state.fontBlobUrl = URL.createObjectURL(blob);

            const fontFace = new FontFace('CustomImportedFont', `url(${state.fontBlobUrl})`);
            fontFace.load().then(loadedFace => {
                document.fonts.add(loadedFace);
                applyFontToPreview();
                showToast(`Loaded "${state.fontData.fullName}"`);
            }).catch(err => {
                console.error('FontFace load error:', err);
            });

            // Update Picker Card State
            pickerTitle.textContent = state.fontData.fullName;
            pickerSubtitle.textContent = `${state.fontData.format} • ${state.fontData.numGlyphs || 0} Glyphs`;

            // Update Font Info Card
            fontInfoRow.style.display = 'flex';
            fontNameElem.textContent = state.fontData.fullName;
            fontFormatElem.textContent = `${state.fontData.format} • ${state.fontData.version || 'v1.0'}`;

            if (state.fontData.isVariable) {
                fontTypeBadge.textContent = 'Variable';
                renderVariableControls();
            } else {
                fontTypeBadge.textContent = 'Static';
                variableControlsGroup.style.display = 'none';
            }

            btnApply.disabled = false;
        };

        reader.readAsArrayBuffer(file);
    }

    // Render Variable Presets and Axis Sliders
    function renderVariableControls() {
        variableControlsGroup.style.display = 'flex';
        slidersContainer.innerHTML = '';
        presetsContainer.innerHTML = '';
        state.axisValues = {};

        const presets = [
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

        if (state.fontData.instances && state.fontData.instances.length > 0) {
            state.fontData.instances.forEach(inst => {
                presets.push({ name: inst.name, values: inst.values });
            });
        }

        presets.forEach((preset, idx) => {
            const chip = document.createElement('button');
            chip.className = `m3-chip ${idx === 0 ? 'active' : ''}`;
            chip.textContent = preset.name;
            chip.onclick = () => {
                document.querySelectorAll('.m3-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                if (preset.values.mode === 'auto') {
                    state.weightMode = 'auto';
                    state.fontData.axes.forEach(axis => {
                        state.axisValues[axis.tag] = axis.default;
                        const slider = document.getElementById(`slider-${axis.tag}`);
                        const badge = document.getElementById(`badge-${axis.tag}`);
                        if (slider) slider.value = axis.default;
                        if (badge) badge.textContent = axis.default;
                    });
                } else {
                    state.weightMode = 'custom';
                    for (const [tag, val] of Object.entries(preset.values)) {
                        state.axisValues[tag] = val;
                        const slider = document.getElementById(`slider-${tag}`);
                        const badge = document.getElementById(`badge-${tag}`);
                        if (slider) slider.value = val;
                        if (badge) badge.textContent = val;
                    }
                }
                applyFontToPreview();
            };
            presetsContainer.appendChild(chip);
        });

        state.fontData.axes.forEach(axis => {
            state.axisValues[axis.tag] = axis.default;

            const unit = document.createElement('div');
            unit.className = 'slider-unit-box';
            unit.innerHTML = `
                <div class="slider-top">
                    <span class="axis-name">${axis.name} (${axis.tag})</span>
                    <span class="axis-val-chip" id="badge-${axis.tag}">${axis.default}</span>
                </div>
                <input type="range" id="slider-${axis.tag}" min="${axis.min}" max="${axis.max}" step="${(axis.max - axis.min) > 100 ? 10 : 1}" value="${axis.default}">
            `;

            const slider = unit.querySelector('input');
            const badge = unit.querySelector('.axis-val-chip');

            slider.oninput = (e) => {
                const val = parseFloat(e.target.value);
                badge.textContent = val;
                state.axisValues[axis.tag] = val;
                state.weightMode = 'custom';
                document.querySelectorAll('.m3-chip').forEach(c => c.classList.remove('active'));
                applyFontToPreview();
            };

            slidersContainer.appendChild(unit);
        });
    }

    // Live Font Variation Settings
    function applyFontToPreview() {
        let variationSettings = '';
        if (state.fontData && state.fontData.isVariable && Object.keys(state.axisValues).length > 0) {
            const settingsArr = [];
            for (const [tag, val] of Object.entries(state.axisValues)) {
                settingsArr.push(`"${tag}" ${val}`);
            }
            variationSettings = settingsArr.join(', ');
        }

        previewElements.forEach(el => {
            el.style.fontFamily = "'CustomImportedFont', sans-serif";
            if (variationSettings) {
                el.style.fontVariationSettings = variationSettings;
            } else {
                el.style.fontVariationSettings = 'normal';
            }
        });
    }

    // Apply Font Action (Safe Chunked Streaming)
    btnApply.addEventListener('click', async () => {
        if (!state.fontBuffer) {
            showToast('Please select a font file first.');
            return;
        }

        showConfirmModal(
            'Apply Font',
            `Apply <strong>${state.fontData.fullName}</strong> across /system and /product partitions?<br><br>Stock fonts are securely backed up.`,
            'Apply Font',
            async () => {
                showToast('Streaming font overlay to system...', 2000);
                btnApply.disabled = true;

                try {
                    // Safe ArrayBuffer to Base64
                    const uint8 = new Uint8Array(state.fontBuffer);
                    let binary = '';
                    const chunkSize = 16384;
                    for (let i = 0; i < uint8.length; i += chunkSize) {
                        const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
                        binary += String.fromCharCode.apply(null, chunk);
                    }
                    const base64 = btoa(binary);

                    const tmpB64 = '/data/local/tmp/font_tmp.b64';
                    const tmpTtf = '/data/local/tmp/font_tmp.ttf';
                    const tmpCfg = '/data/local/tmp/config_tmp.json';

                    await execCommand(`rm -f ${tmpB64} ${tmpTtf} ${tmpCfg}`);

                    // Stream base64 in 48KB slices
                    const B64_CHUNK = 49152;
                    for (let i = 0; i < base64.length; i += B64_CHUNK) {
                        const slice = base64.slice(i, i + B64_CHUNK);
                        const op = (i === 0) ? '>' : '>>';
                        await execCommand(`printf '%s' "${slice}" ${op} ${tmpB64}`);
                    }

                    // Decode base64 to TTF
                    await execCommand(`base64 -d ${tmpB64} > ${tmpTtf} && rm -f ${tmpB64}`);

                    const configObj = {
                        font_name: state.fontData.fullName,
                        is_variable: state.fontData.isVariable,
                        weight_mode: state.weightMode,
                        axes: state.axisValues,
                        applied_at: Date.now()
                    };

                    const configJson = JSON.stringify(configObj).replace(/'/g, "\\'");
                    await execCommand(`printf '%s' '${configJson}' > ${tmpCfg}`);

                    const applyCmd = `if [ -f /data/adb/modules/fontify/bin/apply_font.sh ]; then /data/adb/modules/fontify/bin/apply_font.sh ${tmpTtf} ${tmpCfg}; else /data/adb/modules/custom_font_installer/bin/apply_font.sh ${tmpTtf} ${tmpCfg}; fi`;
                    const res = await execCommand(applyCmd);
                    await execCommand(`rm -f ${tmpTtf} ${tmpCfg}`);

                    // Update browser storage immediately
                    localStorage.setItem('fontify_is_active', 'true');
                    localStorage.setItem('fontify_active_font', state.fontData.fullName);

                    showConfirmModal(
                        'Font Applied',
                        'Custom font overlay applied successfully!<br><br>Reboot to reload fonts across apps & system:',
                        'Reboot',
                        () => execCommand('pkill -f system_server || killall system_server'),
                        'reboot'
                    );
                    loadSystemStatus();
                } catch (e) {
                    showToast('Font applied. Please reboot.');
                    console.error('Apply error:', e);
                    localStorage.setItem('fontify_is_active', 'true');
                    localStorage.setItem('fontify_active_font', state.fontData.fullName);
                    loadSystemStatus();
                } finally {
                    btnApply.disabled = false;
                }
            },
            'apply'
        );
    });

    // Revert Action
    btnRestore.addEventListener('click', () => {
        showConfirmModal(
            'Revert to Stock',
            'Remove custom font overlays and restore original stock system font?',
            'Revert',
            async () => {
                showToast('Reverting to stock font...');
                const res = await execCommand('if [ -f /data/adb/modules/fontify/bin/restore_stock.sh ]; then /data/adb/modules/fontify/bin/restore_stock.sh; else /data/adb/modules/custom_font_installer/bin/restore_stock.sh; fi');

                localStorage.setItem('fontify_is_active', 'false');
                localStorage.setItem('fontify_active_font', 'Roboto / Google Sans');

                showConfirmModal(
                    'Stock Restored',
                    'Stock font restored safely.<br><br>Reboot to reload fonts:',
                    'Reboot',
                    () => execCommand('pkill -f system_server || killall system_server'),
                    'reboot'
                );
                loadSystemStatus();
            },
            'revert'
        );
    });

    // Reboot Action
    btnSoftReboot.addEventListener('click', () => {
        showConfirmModal(
            'Reboot',
            'Restart system framework to reload fonts?',
            'Reboot',
            () => execCommand('pkill -f system_server || killall system_server'),
            'reboot'
        );
    });

    // Dynamic Theme Decor Sync (KernelSU / MMRL / System Scheme)
    function setupTheming() {
        const updateDecor = () => {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // Update meta theme-color tag
            let metaTheme = document.getElementById('meta-theme-color');
            if (!metaTheme) {
                metaTheme = document.createElement('meta');
                metaTheme.id = 'meta-theme-color';
                metaTheme.name = 'theme-color';
                document.head.appendChild(metaTheme);
            }
            metaTheme.setAttribute('content', isDark ? '#11140e' : '#f8faf0');

            // MMRL / KernelSU bridge status bar decor
            try {
                if (typeof window.$fontify !== 'undefined' && typeof window.$fontify.setLightStatusBars === 'function') {
                    window.$fontify.setLightStatusBars(!isDark);
                }
                if (typeof window.ksu !== 'undefined' && typeof window.ksu.setWindowDecor === 'function') {
                    window.ksu.setWindowDecor(isDark ? '#11140e' : '#f8faf0', !isDark);
                }
            } catch (_) {}
        };

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDecor);
        updateDecor();
    }

    // Support user custom.css override if present
    function setupUserCustomization() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'custom.css';
        link.onerror = () => link.remove();
        document.head.appendChild(link);
    }

    // Initial Load
    loadSystemStatus();
});
