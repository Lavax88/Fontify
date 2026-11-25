/**
 * Fontify - Shared File Dropzone & ArrayBuffer Reader Adapter
 */

export interface DropzoneBindingOptions {
  dropzoneId: string;
  fileInputId: string;
  buttonId: string;
  onFileLoaded: (file: File, buffer: ArrayBuffer) => void | Promise<void>;
  onError?: (err: unknown) => void;
}

export function bindFileDropzone(options: DropzoneBindingOptions): void {
  if (typeof document === 'undefined') return;

  const dropzone = document.getElementById(options.dropzoneId);
  const fileInput = document.getElementById(options.fileInputId) as HTMLInputElement | null;
  const triggerBtn = document.getElementById(options.buttonId);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async event => {
      const buffer = event.target?.result as ArrayBuffer | undefined;
      if (!buffer) return;
      await options.onFileLoaded(file, buffer);
    };
    reader.onerror = () => {
      options.onError?.(reader.error || new Error('Failed to read file.'));
    };
    reader.readAsArrayBuffer(file);
  };

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
        readFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (triggerBtn && fileInput) {
    triggerBtn.addEventListener('click', e => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        readFile(target.files[0]);
      }
    });
  }
}
