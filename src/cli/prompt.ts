import readline from 'readline';
import type { Page } from 'playwright';
import { BrowserConsole } from '../browser/console-overlay.js';

export function waitForEnter(prompt = 'Press ENTER when ready... '): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

type BrowserWindow = Window & { __pexSaveChoice: string | null };

/**
 * Renders an interactive save-location picker inside the browser overlay console
 * AND simultaneously listens in the terminal — whichever responds first wins.
 *
 * Returns one of: 'current' | 'home' | 'desktop' | '<custom path>'
 */
export async function promptSaveLocation(page: Page, overlay?: BrowserConsole): Promise<string> {
  console.log('\n💾 Save location?  [1] Current (default)  [2] Home  [3] Desktop  [4] Custom path');
  console.log('   Answer here in the terminal OR in the open browser console.\n');

  const console_ = overlay ?? new BrowserConsole(page);
  await console_.mount();

  // Inject the save UI and reset the shared result slot
  await page.evaluate(
    ({ contentId }) => {
      /* eslint-disable no-undef */
      const w = window as unknown as BrowserWindow;
      w.__pexSaveChoice = null;

      const consoleContent = document.getElementById(contentId);
      if (!consoleContent) {
        w.__pexSaveChoice = 'current';
        return;
      }

      consoleContent.innerHTML = '';
      consoleContent.insertAdjacentHTML(
        'beforeend',
        `
      <div style="margin-top:20px;color:#ffaa00;font-weight:bold;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div style="margin-top:10px;color:#00bfff;font-weight:bold;">💾 Choose Save Location</div>
      <div style="margin-top:8px;color:#aaaaaa;">Where would you like to save your Perplexity threads?</div>
      <div style="margin-top:12px;color:#aaaaaa;">
        <div style="margin-bottom:5px;">  [1] 📁 Current Folder (Default)</div>
        <div style="margin-bottom:5px;">  [2] 🏠 Home Folder (~)</div>
        <div style="margin-bottom:5px;">  [3] 🖥️  Desktop (~/Desktop)</div>
        <div style="margin-bottom:5px;">  [4] ✏️  Custom Path</div>
      </div>
      <div style="margin-top:8px;color:#555;font-size:11px;">↕ You can also answer in the terminal window</div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:10px;">
        <span style="color:#00ff00;">$</span>
        <span style="color:#aaaaaa;">Enter choice [1-4]:</span>
        <input
          type="text"
          id="pex-save-choice"
          autocomplete="off"
          style="background:transparent;border:none;border-bottom:2px solid #00ff00;
                 color:#00ff00;font-family:inherit;font-size:inherit;
                 padding:2px 8px;outline:none;width:60px;caret-color:#00ff00;"
        >
      </div>
      <div id="pex-custom-path-container" style="display:none;margin-top:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="color:#00ff00;">$</span>
          <span style="color:#aaaaaa;">Enter path:</span>
          <input
            type="text"
            id="pex-custom-path"
            autocomplete="off"
            placeholder="/path/to/folder"
            style="background:transparent;border:none;border-bottom:2px solid #00ff00;
                   color:#00ff00;font-family:inherit;font-size:inherit;
                   padding:2px 8px;outline:none;flex:1;caret-color:#00ff00;"
          >
        </div>
      </div>
      `
      );

      function appendEcho(text: string, color = '#00ff00') {
        if (!consoleContent) return;
        const d = document.createElement('div');
        d.style.cssText = `color:${color};margin-top:5px;`;
        d.textContent = text;
        consoleContent.appendChild(d);
        consoleContent.scrollTop = consoleContent.scrollHeight;
      }

      const choiceInput = document.getElementById('pex-save-choice') as HTMLInputElement | null;
      if (!choiceInput) {
        w.__pexSaveChoice = 'current';
        return;
      }

      requestAnimationFrame(() => {
        consoleContent.scrollTop = 0;
        choiceInput.focus();
      });

      choiceInput.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') return;
        const choice = (e.target as HTMLInputElement).value.trim();

        if (choice === '1' || choice === '') {
          appendEcho('> Selected: Current Folder');
          w.__pexSaveChoice = 'current';
        } else if (choice === '2') {
          appendEcho('> Selected: Home Folder');
          w.__pexSaveChoice = 'home';
        } else if (choice === '3') {
          appendEcho('> Selected: Desktop');
          w.__pexSaveChoice = 'desktop';
        } else if (choice === '4') {
          appendEcho('> Enter a custom path below');
          const customContainer = document.getElementById('pex-custom-path-container');
          if (customContainer) {
            customContainer.style.display = 'block';
            const customInput = document.getElementById('pex-custom-path') as HTMLInputElement;
            customInput.focus();
            customInput.addEventListener('keypress', (e2) => {
              if (e2.key !== 'Enter') return;
              const p = (e2.target as HTMLInputElement).value.trim();
              if (p) {
                appendEcho(`> Path: ${p}`);
                w.__pexSaveChoice = p;
              }
            });
          }
        } else {
          appendEcho('> Invalid choice — using Current Folder', '#ffaa00');
          w.__pexSaveChoice = 'current';
        }
      });
    },
    { contentId: console_.contentId }
  );

  // --- Race: browser UI vs terminal input ---
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const browserChoice = page
    .waitForFunction(() => (window as unknown as BrowserWindow).__pexSaveChoice !== null, {
      timeout: 0,
    })
    .then(() =>
      page.evaluate(() => (window as unknown as BrowserWindow).__pexSaveChoice as string)
    );

  const terminalChoice = new Promise<string>((resolve) => {
    rl.question('   Choice [1-4] (Enter = current): ', (answer) => {
      const c = answer.trim();
      if (c === '2') {
        resolve('home');
      } else if (c === '3') {
        resolve('desktop');
      } else if (c === '4') {
        rl.question('   Custom path: ', (p) => resolve(p.trim() || 'current'));
      } else {
        resolve('current');
      }
    });
  });

  const result = await Promise.race([browserChoice, terminalChoice]);

  // Close readline (cancels any pending terminal question if browser won)
  rl.close();

  // Confirm the chosen location in the browser console
  await page
    .evaluate(
      ({ contentId, chosen }) => {
        /* eslint-disable no-undef */
        const el = document.getElementById(contentId);
        if (!el) return;
        const d = document.createElement('div');
        d.style.cssText = 'color:#555;font-size:11px;margin-top:10px;';
        d.textContent = `✓ Saving to: ${chosen}`;
        el.appendChild(d);
        el.scrollTop = el.scrollHeight;
      },
      { contentId: console_.contentId, chosen: result }
    )
    .catch(() => {
      /* ignore — page may have closed */
    });

  return result;
}
