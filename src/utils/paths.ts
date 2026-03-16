import os from 'os';
import path from 'path';

/**
 * Resolves a save location alias (from the browser prompt) to an absolute path.
 * Passes through any string that doesn't match a known alias as a literal path.
 */
export function resolveSavePath(saveDir: string): string {
  switch (saveDir) {
    case 'current':
      return process.cwd();
    case 'home':
      return os.homedir();
    case 'desktop':
      return path.join(os.homedir(), 'Desktop');
    default:
      return saveDir;
  }
}
