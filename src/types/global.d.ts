/**
 * Global type declarations for Prokcy
 */

// Window extensions for Whistle integration
interface Window {
  showWhistleWebUI?: (name: string) => boolean;
}

declare global {
  interface Window {
    showWhistleWebUI?: (name: string) => boolean;
  }
}

export {};
