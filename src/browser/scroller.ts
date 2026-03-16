import type { Page } from 'playwright';
import {
  updateStatusBadge,
  flashScrollContainer,
  removeScrollContainerHighlight,
} from './status-badge.js';

export interface ScrollOptions {
  /** Maximum scroll loop iterations before giving up. Default: 100 */
  maxAttempts?: number;
  /** How many consecutive stable heights before stopping. Default: 3 */
  stableThreshold?: number;
  /** Milliseconds to wait between scroll steps. Default: 2000 */
  waitMs?: number;
  /** CSS selector used to count loaded items. Default: 'a[href*="/search/"]' */
  itemSelector?: string;
}

/**
 * Scrolls a page to the bottom repeatedly until no new content loads.
 * Works with both a `.scrollable-container` element and the full document body.
 *
 * @returns The final count of unique items matching `itemSelector`.
 */
export async function autoScrollToLoadAll(page: Page, opts: ScrollOptions = {}): Promise<number> {
  const {
    maxAttempts = 100,
    stableThreshold = 3,
    waitMs = 2000,
    itemSelector = 'a[href*="/search/"]',
  } = opts;

  let previousHeight = 0;
  let scrollAttempts = 0;
  let stableCount = 0;
  let finalCount = 0;

  while (scrollAttempts < maxAttempts) {
    const scrollInfo = await page.evaluate((selector) => {
      /* eslint-disable no-undef */
      const scrollContainer = document.querySelector('.scrollable-container');
      const allItems = document.querySelectorAll(selector);
      const uniqueLinks = new Set<string>();

      allItems.forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        if (href) uniqueLinks.add(href);
      });

      return {
        height: scrollContainer ? scrollContainer.scrollHeight : document.body.scrollHeight,
        scrollTop: scrollContainer ? scrollContainer.scrollTop : window.scrollY,
        itemCount: uniqueLinks.size,
        visibleItems: allItems.length,
        containerFound: !!scrollContainer,
      };
    }, itemSelector);

    finalCount = scrollInfo.itemCount;

    console.log(
      `   📊 Scroll ${scrollAttempts + 1}: Found ${scrollInfo.itemCount} unique threads (${scrollInfo.visibleItems} elements)`
    );
    console.log(
      `       Height: ${scrollInfo.height}px, ScrollTop: ${scrollInfo.scrollTop}px ${scrollInfo.containerFound ? '(scrollable-container)' : '(fallback)'}`
    );

    await updateStatusBadge(page, {
      html: `
        <div style="font-size:16px;margin-bottom:5px;">🔄 Auto-Scrolling</div>
        <div style="font-size:13px;opacity:0.9;">Attempt: ${scrollAttempts + 1}</div>
        <div style="font-size:13px;opacity:0.9;">Threads: ${scrollInfo.itemCount}</div>
      `,
    });

    if (scrollInfo.height === previousHeight) {
      stableCount++;
      console.log(`   ⏸️  Height stable (${stableCount}/${stableThreshold})`);
      if (stableCount >= stableThreshold) {
        console.log(`   ✅ All threads loaded! Total: ${scrollInfo.itemCount}\n`);
        break;
      }
    } else {
      stableCount = 0;
      console.log(`   📈 New content detected (height increased)`);
    }

    await flashScrollContainer(page);

    await page.evaluate(() => {
      /* eslint-disable no-undef */
      const scrollContainer = document.querySelector('.scrollable-container');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(waitMs);
    previousHeight = scrollInfo.height;
    scrollAttempts++;
  }

  if (scrollAttempts >= maxAttempts) {
    console.log('   ⚠️  Reached max scroll attempts, continuing with loaded threads\n');
  }

  await updateStatusBadge(page, {
    html: `
      <div style="font-size:16px;margin-bottom:5px;">✅ Scrolling Complete</div>
      <div style="font-size:13px;opacity:0.9;">Ready to export...</div>
    `,
    background: '#10b981',
  });

  await removeScrollContainerHighlight(page);

  return finalCount;
}
