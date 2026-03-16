import type { Page } from 'playwright';

const CONSOLE_ID = 'pex-console';
const CONTENT_ID = 'pex-console-content';

/**
 * A macOS-style terminal overlay injected into a Playwright browser page.
 *
 * Reusable across any Playwright-based tool — just instantiate with a page and title.
 *
 * @example
 * const overlay = new BrowserConsole(page, '🔧 My Tool Console');
 * await overlay.mount();
 * await overlay.log('Hello from Node!', '#00bfff');
 */
export class BrowserConsole {
  constructor(
    private readonly page: Page,
    private readonly title: string = '📦 Perplexity Exporter Console'
  ) {}

  /**
   * Inject the console overlay into the page. Safe to call multiple times —
   * if the element already exists it won't be recreated.
   */
  async mount(): Promise<void> {
    await this.page.evaluate(
      ({ consoleId, contentId, consoleTitle }) => {
        /* eslint-disable no-undef */
        if (document.getElementById(consoleId)) return;

        const consoleEl = document.createElement('div');
        consoleEl.id = consoleId;
        consoleEl.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          max-width: 1000px;
          height: min(650px, calc(100vh - 100px));
          background: rgba(0, 0, 0, 0.95);
          color: #00ff00;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          z-index: 9999;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
          background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
          padding: 8px 12px;
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        `;

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 6px;';
        buttons.innerHTML = `
          <div style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></div>
        `;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = `
          color: #c0c0c0;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        `;
        titleEl.textContent = consoleTitle;

        header.appendChild(buttons);
        header.appendChild(titleEl);

        const content = document.createElement('div');
        content.id = contentId;
        content.style.cssText = `
          flex: 1 1 0%;
          padding: 15px;
          overflow-y: scroll;
          scroll-behavior: smooth;
        `;

        consoleEl.appendChild(header);
        consoleEl.appendChild(content);
        document.body.appendChild(consoleEl);
      },
      { consoleId: CONSOLE_ID, contentId: CONTENT_ID, consoleTitle: this.title }
    );
  }

  /** Append a line of text to the console output. */
  async log(message: string, color = '#00ff00'): Promise<void> {
    await this.page.evaluate(
      ({ contentId, msg, col }) => {
        /* eslint-disable no-undef */
        const content = document.getElementById(contentId);
        if (!content) return;
        const line = document.createElement('div');
        line.style.color = col;
        line.textContent = msg;
        content.appendChild(line);
        content.scrollTop = content.scrollHeight;
      },
      { contentId: CONTENT_ID, msg: message, col: color }
    );
  }

  /** Append raw HTML to the console output. */
  async appendHtml(html: string): Promise<void> {
    await this.page.evaluate(
      ({ contentId, markup }) => {
        /* eslint-disable no-undef */
        const content = document.getElementById(contentId);
        if (!content) return;
        content.insertAdjacentHTML('beforeend', markup);
        content.scrollTop = content.scrollHeight;
      },
      { contentId: CONTENT_ID, markup: html }
    );
  }

  /** Clear all output from the console. */
  async clear(): Promise<void> {
    await this.page.evaluate((contentId) => {
      /* eslint-disable no-undef */
      const content = document.getElementById(contentId);
      if (content) content.innerHTML = '';
    }, CONTENT_ID);
  }

  /** Returns the element ID of the console content div (for page.evaluate use). */
  get contentId(): string {
    return CONTENT_ID;
  }
}
