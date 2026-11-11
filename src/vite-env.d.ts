/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    switchTab?: (tabId: 'overview' | 'customize') => void;
  }
}
