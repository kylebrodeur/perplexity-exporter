import { chromium, type BrowserContext } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';

const LAUNCH_OPTS = {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
  args: ['--disable-blink-features=AutomationControlled'],
};

export async function launchBrowser(userDataDir?: string): Promise<BrowserContext> {
  const dataDir = userDataDir ?? path.resolve('./browser-data-playwright');

  try {
    return await chromium.launchPersistentContext(dataDir, LAUNCH_OPTS);
  } catch (err) {
    if (isExecutableNotFoundError(err)) {
      console.log('Chromium not found — downloading now (one-time setup, ~150MB)...');
      const result = spawnSync('npx', ['playwright', 'install', 'chromium'], {
        stdio: 'inherit',
        shell: true,
      });
      if (result.status !== 0) {
        throw new Error(
          'Failed to install Chromium. Run `npx playwright install chromium` manually and retry.'
        );
      }
      return chromium.launchPersistentContext(dataDir, LAUNCH_OPTS);
    }

    // Chromium leaves a SingletonLock behind when a previous run was force-killed.
    // If no browser is actually running we can safely remove it and retry once.
    if (isSingletonLockError(err)) {
      const lockFile = path.join(dataDir, 'SingletonLock');
      console.warn('⚠️  Stale browser lock detected — removing and retrying...');
      try {
        await fs.unlink(lockFile);
      } catch {
        throw new Error(
          'Another Chromium instance is already using the browser profile.\n' +
            'Close the existing browser window and try again.'
        );
      }
      return chromium.launchPersistentContext(dataDir, LAUNCH_OPTS);
    }
    throw err;
  }
}

function isExecutableNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Executable doesn't exist") || msg.includes('executable does not exist');
}

function isSingletonLockError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('ProcessSingleton') || msg.includes('SingletonLock');
}
