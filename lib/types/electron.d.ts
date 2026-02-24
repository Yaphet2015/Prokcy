// Electron type augmentations and custom extensions
import { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';

export interface WindowControls {
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
}

export interface RuntimeConfig {
  host: string;
  port: string | number;
  username: string;
  password: string;
}

export interface IpcRequest {
  host: string;
  port: string | number;
  username: string;
  password: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path?: string;
  body?: unknown;
  timeout?: number;
}

export interface NetworkQuery {
  count?: number;
  [key: string]: string | number | undefined;
}
