// sudo-prompt type declarations
declare module 'sudo-prompt' {
  export interface Options {
    name?: string;
    icns?: string;
    env?: Record<string, string>;
  }

  export function exec(
    command: string,
    options: Options,
    callback: (error?: Error, stdout?: string, stderr?: string) => void
  ): void;
}
