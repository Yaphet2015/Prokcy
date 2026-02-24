// Context module type declarations
import { MessagePort } from 'worker_threads';
import { BrowserWindow } from 'electron';

export interface ContextOptions {
  host?: string;
  port: number;
}

declare module './context' {
  export function execJsSafe(code: string): Promise<unknown>;
  export function setChild(c: MessagePort | null): void;
  export function getChild(): MessagePort | null;
  export function setWin(w: BrowserWindow | null): void;
  export function getWin(): BrowserWindow | null;
  export function setOptions(o: ContextOptions | null): void;
  export function getOptions(): ContextOptions | null;
  export function sendMsg(data: { type: string; [key: string]: unknown }): void;
  export function setDataUrl(url: string): void;
  export function isRunning(): boolean;
  export function setRunning(running: boolean): void;
}
