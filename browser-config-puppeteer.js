import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

// Add stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Puppeteer-based browser configuration with stealth plugin
 * This has better Cloudflare bypass than Playwright
 */

export async function createStealthBrowser(usePersistentContext = true) {
  console.log('🔧 Using Puppeteer with Stealth Plugin');

  const browserConfig = {
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  };

  let browser;

  if (usePersistentContext) {
    const userDataDir = path.resolve('./browser-data');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    console.log(`🔧 Using persistent profile: ${userDataDir}`);
    browserConfig.userDataDir = userDataDir;
  }

  browser = await puppeteer.launch(browserConfig);
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Add extra stealth measures
  await page.evaluateOnNewDocument(() => {
    // Override the navigator.webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

    // Add chrome runtime
    window.chrome = {
      runtime: {},
    };

    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  return { browser, page };
}

/**
 * Wait for Cloudflare challenge to complete
 */
export async function handleCloudflareChallenge(page, timeout = 30000) {
  try {
    console.log('🔍 Checking for Cloudflare challenge...');

    // Wait a bit for page to load
    await page.waitForTimeout(2000);

    // Check for Cloudflare challenge
    const content = await page.content();
    if (content.includes('Verify you are human') || content.includes('cloudflare')) {
      console.log('⏳ Cloudflare challenge detected - waiting for completion...');

      // Wait for the challenge to disappear
      await page
        .waitForFunction(() => !document.body.textContent.includes('Verify you are human'), {
          timeout,
        })
        .catch(() => {
          console.log('⚠️  Cloudflare challenge timeout - proceeding anyway');
        });

      console.log('✅ Cloudflare challenge completed!');
      await page.waitForTimeout(2000);
    } else {
      console.log('✅ No Cloudflare challenge detected');
    }
  } catch (error) {
    console.log('⚠️  Cloudflare check error:', error.message);
  }
}

/**
 * Perplexity API configuration
 */
export const PERPLEXITY_API = {
  BASE_URL: 'https://www.perplexity.ai',
  API_BASE: 'https://www.perplexity.ai/api',
  VERSION: 'v2.18',

  buildUrl: (endpoint) => {
    return `${PERPLEXITY_API.API_BASE}/${endpoint}`;
  },
};

/**
 * Known API endpoints from analysis
 */
export const ENDPOINTS = {
  // Thread endpoints
  LIST_ALL_THREADS: 'rest/thread/list_ask_threads?limit=1000&offset=0',
  GET_THREAD_DETAIL: (slug) => `rest/thread/${slug}`,

  // Collection endpoints
  LIST_USER_COLLECTIONS: 'rest/collections/list_user_collections?limit=1000&offset=0',
  GET_COLLECTION_DETAIL: (uuid) => `rest/collections/get_collection?uuid=${uuid}`,

  // Bookmark endpoints
  LIST_BOOKMARKS: 'rest/bookmarks/list_user_bookmarks?limit=1000&offset=0',
};
