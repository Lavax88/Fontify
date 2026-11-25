/// <reference types="vite/client" />

declare module '@m3e/icons/*';

export {};

declare global {
  interface Window {
    switchTab?: (tabId: 'overview' | 'browse' | 'customize' | 'emoji', skipSlide?: boolean) => void;
  }
}
