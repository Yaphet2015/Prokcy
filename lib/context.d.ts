// Context module type declarations
import { BrowserWindow, UtilityProcess } from 'electron';

export interface ContextOptions {
  host?: string;
  port: number;
}

export function execJsSafe(code: string): Promise<unknown>;
export function setChild(c: UtilityProcess | null): void;
export function getChild(): UtilityProcess | null;
export function setWin(w: BrowserWindow | null): void;
export function getWin(): BrowserWindow | null;
export function setOptions(o: ContextOptions | null): void;
export function getOptions(): ContextOptions | null;
export function sendMsg(data: { type: string; [key: string]: unknown }): void;
export function setDataUrl(url: string): void;
export function isRunning(): boolean;
export function setRunning(running: boolean): void;
