import type { Page } from 'playwright';
import type { ThreadLink } from '../types.js';

/** Scrapes all unique thread links visible in the current page DOM. */
export async function scrapeThreadLinks(page: Page): Promise<ThreadLink[]> {
  return page.evaluate(() => {
    /* eslint-disable no-undef */
    const elements = document.querySelectorAll('a[href*="/search/"]');
    const threads: Array<{ id: string; title: string; url: string; slug: string }> = [];

    elements.forEach((el) => {
      const href = (el as HTMLAnchorElement).href;
      const title = (el as HTMLElement).textContent?.trim() || el.getAttribute('aria-label') || '';

      if (href && title && href.includes('/search/')) {
        const match = href.match(/\/search\/([^/?]+)/);
        if (match?.[1]) {
          threads.push({ id: match[1], title, url: href, slug: match[1] });
        }
      }
    });

    // Deduplicate by thread ID
    return [...new Map(threads.map((t) => [t.id, t])).values()];
  });
}
