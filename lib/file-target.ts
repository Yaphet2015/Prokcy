import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LocalFileTarget {
  kind: 'local-file';
  path: string;
}

export interface UnsupportedFileTarget {
  kind: 'unsupported-target';
  code: 'unsupported_target';
  message: 'This Whistle file target is not a local file path.';
}

export type ResolvedFileProtocolTarget = LocalFileTarget | UnsupportedFileTarget;

const FILE_TARGET_UNSUPPORTED: UnsupportedFileTarget = {
  kind: 'unsupported-target',
  code: 'unsupported_target',
  message: 'This Whistle file target is not a local file path.',
};

function normalizeLocalFilePath(filePath: string): string {
  if (/^\/[a-z]:\//i.test(filePath)) {
    return path.win32.normalize(filePath.slice(1));
  }

  return filePath;
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveFileProtocolTarget(
  target: string,
  options: { homeDir?: string } = {},
): ResolvedFileProtocolTarget {
  const homeDir = options.homeDir ?? os.homedir();

  if (target.startsWith('file://~/')) {
    const relativePath = decodePathSegment(target.slice('file://~/'.length));
    return {
      kind: 'local-file',
      path: path.join(homeDir, relativePath),
    };
  }

  if (/^file:\/\/[a-z]:[\\/]/i.test(target)) {
    const windowsPath = decodePathSegment(target.slice('file://'.length));
    return {
      kind: 'local-file',
      path: path.win32.normalize(windowsPath),
    };
  }

  if (target.startsWith('file:///') || target.startsWith('file://localhost/')) {
    try {
      return {
        kind: 'local-file',
        path: normalizeLocalFilePath(fileURLToPath(target)),
      };
    } catch {
      return FILE_TARGET_UNSUPPORTED;
    }
  }

  return FILE_TARGET_UNSUPPORTED;
}
