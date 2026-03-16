import type { Page } from 'playwright';

export async function isLoggedIn(page: Page): Promise<boolean> {
  return (await page.locator('a[href*="/library"]').count()) > 0;
}

export async function ensureLoggedIn(page: Page): Promise<void> {
  if (await isLoggedIn(page)) return;

  console.log('⚠️  Please log in to Perplexity');
  console.log('   Press ENTER after logging in...\n');

  // Inline readline prompt to avoid a circular dep with cli/prompt.ts
  const readline = await import('readline');
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Press ENTER when ready... ', () => {
      rl.close();
      resolve();
    });
  });
}

export async function navigateToLibrary(page: Page): Promise<void> {
  console.log('📚 Navigating to Library...');
  await page.goto('https://www.perplexity.ai/library', { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForSelector('a[href*="/search/"]', { timeout: 10000 });
  } catch {
    console.log('⚠️  No threads found or page not loaded properly');
  }

  await page.waitForTimeout(2000);
}
