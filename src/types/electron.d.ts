/**
 * Electron IPC type definitions
 */

// IPC message types sent from main to renderer
export type IpcMessageType =
  | 'options'
  | 'rules'
  | 'values'
  | 'selectedRules'
  | 'selectedValues'
  | 'network'
  | 'getRules'
  | 'getValues'
  | 'selectRules'
  | 'selectValues'
  | 'setRules'
  | 'setValues'
  | 'getOptions';

export interface IpcMessage {
  type: IpcMessageType;
  [key: string]: unknown;
}

// Renderer process API (preload script exposed)
export interface ElectronAPI {
  send: (channel: string, data: unknown) => void;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
