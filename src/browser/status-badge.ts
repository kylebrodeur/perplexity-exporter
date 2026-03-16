import type { Page } from 'playwright';

export interface BadgeUpdate {
  html: string;
  background?: string;
}

/** Injects the top-right status badge into the page. Idempotent. */
export async function createStatusBadge(page: Page): Promise<void> {
  await page.evaluate(() => {
    /* eslint-disable no-undef */
    if (document.getElementById('pex-status-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'pex-status-badge';
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a73e8;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    badge.textContent = '🔄 Auto-scrolling to load threads...';
    document.body.appendChild(badge);

    const scrollContainer = document.querySelector('.scrollable-container') as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.style.outline = '3px solid #1a73e8';
      scrollContainer.style.outlineOffset = '-3px';
    }
  });
}

export async function updateStatusBadge(page: Page, opts: BadgeUpdate): Promise<void> {
  await page.evaluate(({ html, background }) => {
    /* eslint-disable no-undef */
    const badge = document.getElementById('pex-status-badge');
    if (!badge) return;
    if (background) badge.style.background = background;
    badge.innerHTML = html;
  }, opts);
}

export async function flashScrollContainer(page: Page): Promise<void> {
  await page.evaluate(() => {
    /* eslint-disable no-undef */
    const el = document.querySelector('.scrollable-container') as HTMLElement | null;
    if (!el) return;
    el.style.outline = '3px solid #fbbf24';
    setTimeout(() => {
      el.style.outline = '3px solid #1a73e8';
    }, 300);
  });
}

export async function removeScrollContainerHighlight(page: Page): Promise<void> {
  await page.evaluate(() => {
    /* eslint-disable no-undef */
    const el = document.querySelector('.scrollable-container') as HTMLElement | null;
    if (el) el.style.outline = 'none';
  });
}
