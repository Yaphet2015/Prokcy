// Whistle type declarations (stubs for untyped dependencies)
declare module 'whistle' {
  export interface WhistleOptions {
    port: number;
    host?: string;
    socksPort?: number;
    username?: string;
    password?: string;
    uiAuth?: { username?: string; password?: string };
    maxHttpHeaderSize?: number;
  }

  export interface RulesPayload {
    [key: string]: any;
    defalutRules?: string;
    list?: Array<{ name: string; selected: boolean }>;
  }

  export function startWhistle(options: WhistleOptions): any;
  export function getWhistlePath(): string;
}

declare module 'whistle/require' {
  export default function requireW2(name: string): any;
}

declare module 'whistle/lib/util/common' {
  export function writeLogSync(message: string): void;
}

declare module 'whistle.proxyauth' {
  const version: string;
  export default version;
}
