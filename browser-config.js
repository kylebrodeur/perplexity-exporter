import { firefox } from 'playwright';
import fs from 'fs';

/**
 * Load cookies from cookies.json if it exists
 */
export function loadCookies() {
  try {
    if (fs.existsSync('cookies.json')) {
      const cookiesData = fs.readFileSync('cookies.json', 'utf-8');
      return JSON.parse(cookiesData);
    }
  } catch (error) {
    console.warn('⚠️  Could not load cookies:', error.message);
  }
  return null;
}

/**
 * Shared browser configuration for all Perplexity export scripts
 * Includes stealth techniques to bypass automation detection
 */

export const BROWSER_CONFIG = {
  launch: {
    headless: false,
    // Firefox is much better at bypassing bot detection
    args: [
      // Firefox-specific args (much simpler than Chrome)
    ],
    ]
  },
  
  context: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.140 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation', 'notifications'],
    geolocation: { longitude: -74.006, latitude: 40.7128 },
    colorScheme: 'light',
    hasTouch: false,
    isMobile: false,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"15.6.1"',
      'sec-ch-ua-arch': '"arm"',
      'sec-ch-ua-bitness': '"64"',
      'sec-ch-ua-model': '""'
    }
  }
};

/**
 * Stealth script to hide automation indicators
 * Inject this into pages to avoid detection
 */
export const STEALTH_SCRIPT = () => {
  // Overwrite the navigator properties
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
  });
  
  // Mock plugins with realistic data
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format', length: 1 },
        { name: 'Chromium PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format', length: 1 },
        { name: 'Microsoft Edge PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format', length: 1 },
        { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 }
      ];
      plugins.refresh = () => {};
      return plugins;
    }
  });
  
  // Languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en']
  });
  
  // Hardware concurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8
  });
  
  // Device memory
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8
  });
  
  // Platform
  Object.defineProperty(navigator, 'platform', {
    get: () => 'MacIntel'
  });
  
  // Vendor
  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.'
  });
  
  // Add chrome runtime
  if (!window.chrome) {
    window.chrome = {};
  }
  window.chrome.runtime = {
    connect: () => {},
    sendMessage: () => {},
    onMessage: { addListener: () => {}, removeListener: () => {} }
  };
  window.chrome.loadTimes = () => {};
  window.chrome.csi = () => {};
  window.chrome.app = {};
  
  // Mock permissions
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
  );
  
  // Mock battery API
  if (!navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1
    });
  }
  
  // Mock connection API
  Object.defineProperty(navigator, 'connection', {
    get: () => ({
      effectiveType: '4g',
      rtt: 50,
      downlink: 10,
      saveData: false
    })
  });
  
  // Canvas fingerprint randomization
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = imageData.data[i] ^ 1; // Slightly modify RGB
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, args);
  };
  
  // WebGL fingerprint
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
      return 'Apple Inc.';
    }
    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
      return 'Apple M1';
    }
    return getParameter.apply(this, arguments);
  };
  
  // Remove automation hints
  delete navigator.__proto__.webdriver;
  delete Object.getPrototypeOf(navigator).webdriver;
};

/**
 * Create a browser instance with stealth configuration
 * @param {boolean} useCookies - Whether to load and inject cookies from cookies.json
 * @param {boolean} usePersistentContext - Use persistent browser data (recommended for Cloudflare)
 * @returns {Promise<{browser: Browser, context: BrowserContext, page: Page}>}
 */
export async function createStealthBrowser(useCookies = true, usePersistentContext = true) {
  let browser, context;
  
  if (usePersistentContext) {
    // Use persistent context - saves all browser data including Cloudflare tokens
    console.log('🔧 Using Firefox with persistent context (browser-data/)');
    context = await firefox.launchPersistentContext('./browser-data', {
      ...BROWSER_CONFIG.launch,
      ...BROWSER_CONFIG.context,
      headless: false,
    });
    browser = { close: () => context.close() };
  } else {
    browser = await firefox.launch(BROWSER_CONFIG.launch);
    context = await browser.newContext(BROWSER_CONFIG.context);
    
    // Load and inject cookies if available
    if (useCookies) {
      const cookies = loadCookies();
      if (cookies && cookies.length > 0) {
        console.log(`🍪 Loading ${cookies.length} cookies from cookies.json`);
        await context.addCookies(cookies);
      }
    }
  }
  
  const page = context.pages()[0] || await context.newPage();
  
  // Inject stealth script
  await page.addInitScript(STEALTH_SCRIPT);
  
  // Add random mouse movements to appear more human
  await page.addInitScript(() => {
    // Simulate realistic mouse movements
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    // Add slight random delays to actions
    const originalClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function() {
      const delay = Math.random() * 100 + 50; // 50-150ms delay
      setTimeout(() => originalClick.apply(this), delay);
    };
  });
  
  return { browser, context, page };
}

/**
 * Wait for and handle Cloudflare challenge if present
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
export async function handleCloudflareChallenge(page, timeout = 30000) {
  console.log('🔒 Checking for Cloudflare challenge...');
  
  try {
    // Wait a bit for the page to load
    await page.waitForTimeout(2000);
    
    // Check for Cloudflare challenge indicators
    const isChallenged = await page.evaluate(() => {
      return document.title.includes('Just a moment') ||
             document.body.textContent.includes('Checking your browser') ||
             document.querySelector('#challenge-running') !== null ||
             document.querySelector('.cf-browser-verification') !== null;
    });
    
    if (isChallenged) {
      console.log('⏳ Cloudflare challenge detected. Waiting for it to complete...');
      console.log('   Please complete any manual verification if needed.');
      
      // Wait for the challenge to complete
      await page.waitForFunction(
        () => {
          return !document.title.includes('Just a moment') &&
                 !document.body.textContent.includes('Checking your browser') &&
                 document.querySelector('#challenge-running') === null;
        },
        { timeout }
      );
      
      // Give it extra time to fully load
      await page.waitForTimeout(3000);
      console.log('✅ Cloudflare challenge passed!');
    } else {
      console.log('✅ No Cloudflare challenge detected.');
    }
  } catch (error) {
    console.log('⚠️  Cloudflare challenge handling timed out or failed.');
    console.log('   You may need to complete it manually in the browser.');
    console.log('   Waiting 10 more seconds...');
    await page.waitForTimeout(10000);
  }
}

/**
 * Perplexity API configuration
 */
export const PERPLEXITY_API = {
  BASE_URL: 'https://www.perplexity.ai',
  VERSION: '2.18',
  SOURCE: 'default',
  
  // Build API URL with query parameters
  buildUrl(endpoint, params = {}) {
    const url = new URL(`${this.BASE_URL}${endpoint}`);
    url.searchParams.set('version', this.VERSION);
    url.searchParams.set('source', this.SOURCE);
    
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    return url.toString();
  }
};

/**
 * Common API endpoints
 */
export const ENDPOINTS = {
  // Threads
  LIST_RECENT_THREADS: '/rest/thread/list_recent',
  LIST_ALL_THREADS: '/rest/thread/list_ask_threads',
  GET_THREAD: (slug) => `/rest/thread/${slug}`,
  MARK_THREAD_VIEWED: (uuid) => `/rest/thread/mark_viewed/${uuid}`,
  
  // Collections
  LIST_USER_COLLECTIONS: '/rest/collections/list_user_collections',
  LIST_SPACE_TEMPLATES: '/rest/collections/list_space_templates',
  LIST_BOOKMARKS: '/rest/collections/list_bookmarks',
  GET_COLLECTION: '/rest/collections/get_collection',
  LIST_COLLECTION_THREADS: '/rest/collections/list_collection_threads',
  LIST_COLLECTION_ARTICLES: '/rest/collections/list_collection_articles',
  COLLECTION_INVITATIONS: '/rest/collections/invitations'
};
