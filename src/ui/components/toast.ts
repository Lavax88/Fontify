/**
 * Fontify - Snackbar Notification Service (@m3e/web/snackbar)
 */

export function showToast(message: string, duration = 3000): void {
  if (typeof document === 'undefined' || typeof customElements === 'undefined') return;
  void import('@m3e/web/snackbar').then(({ M3eSnackbar }) => {
    M3eSnackbar.open(message, false, { duration });
  });
}
