/**
 * Cookie Extraction Guide
 * 
 * To bypass Cloudflare and authentication, extract cookies from your logged-in browser session.
 * 
 * OPTION 1: Chrome DevTools (Recommended)
 * ==========================================
 * 1. Open Chrome and go to https://www.perplexity.ai
 * 2. Make sure you're logged in
 * 3. Press F12 to open DevTools
 * 4. Go to the "Application" tab
 * 5. In the left sidebar, expand "Cookies" and click on "https://www.perplexity.ai"
 * 6. Copy ALL cookies (you'll need to copy each one)
 * 7. Create a file called `cookies.json` in this directory with the format below
 * 
 * OPTION 2: Use EditThisCookie Extension
 * ==========================================
 * 1. Install "EditThisCookie" extension for Chrome
 * 2. Go to https://www.perplexity.ai (logged in)
 * 3. Click the extension icon
 * 4. Click "Export" button (looks like a download icon)
 * 5. Save the exported JSON to `cookies.json` in this directory
 * 
 * OPTION 3: Automatic Extraction (Run this script)
 * =================================================
 * Run: node extract-cookies.js
 * This will open a browser window. Log in to Perplexity, then press Ctrl+C
 * It will automatically save your cookies to cookies.json
 * 
 * 
 * Cookie File Format (cookies.json)
 * ==================================
 * [
 *   {
 *     "name": "cookie_name",
 *     "value": "cookie_value",
 *     "domain": ".perplexity.ai",
 *     "path": "/",
 *     "expires": -1,
 *     "httpOnly": true,
 *     "secure": true,
 *     "sameSite": "Lax"
 *   }
 * ]
 * 
 * Important cookies to include:
 * - Session cookies (usually named something like __Secure-session, auth_token, etc.)
 * - Cloudflare cookies (__cf_bm, cf_clearance, etc.)
 * - All cookies from .perplexity.ai domain
 */

console.log('Please see the instructions in this file for extracting cookies.');
console.log('\nQuickest method: Run "node extract-cookies.js" to automatically extract your cookies.');
