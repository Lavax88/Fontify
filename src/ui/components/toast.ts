/**
 * Fontify - Toast Notification Component
 */

let toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-stack';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

export function showToast(message: string, duration = 3000): void {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px) scale(0.95)';
    toast.style.transition = 'all 0.25s var(--m3-easing-standard)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
