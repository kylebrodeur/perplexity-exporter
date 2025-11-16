# Conversation Summary: Building Perplexity Exporter

## Date
November 15, 2025

## Goal
Create an automated tool to export Perplexity.ai conversation threads with full details.

## Key Decisions & Evolution

### 1. Initial Approach - TypeScript CLI
- Started with TypeScript-based CLI using Commander.js
- Attempted to use Puppeteer with stealth plugins
- **Problem**: Cloudflare detection made automation difficult

### 2. Pivot to Browser Injection
- Decided to inject JavaScript directly into authenticated browser session
- Created `auto-export.js` using Puppeteer with persistent browser profile
- User manually navigates to Library, then script auto-runs
- **Success**: Bypasses all authentication/Cloudflare issues

### 3. User Experience Improvements

#### Save Location Selection
User requested ability to choose where files are saved:
```javascript
// Added interactive prompt with options:
1. Current folder (default)
2. Home folder (~)
3. Desktop
4. Custom path
```

#### NPX Package Support
Made the tool runnable via npx:
- Updated `package.json` with proper bin configuration
- Added `perplexity-export` command
- Configured for npm publishing
- **Issue discovered**: npx fails locally (package not published yet)
- Can use `npm link` for local testing

### 4. Switch to Playwright

User preference for Playwright due to:
- **Codegen support** - Can record interactions once and generate code
- Better automation capabilities
- More reliable than Puppeteer

Created `auto-export-playwright.js` with:
- Auto-navigation to Library page
- **Auto-scrolling** to load all threads (scrolls until no new content)
- Login detection and wait if needed
- Same save location selection as Puppeteer version

### 5. Using Network Analyzer MCP

#### Problem
Script showed "✅ 0 messages" for all threads - data structure was wrong

#### Solution
Used Network Analyzer MCP to capture real API traffic:

```javascript
// Captured network requests from Perplexity Library
mcp_network-analy_capture_network_requests({
  sessionId: "perplexity-library-capture",
  url: "https://www.perplexity.ai/library"
})

// Analyzed captured data
mcp_network-analy_analyze_captured_data({
  captureId: "perplexity-library-capture"
})
```

**Discovery**: Perplexity uses `steps` array, not `messages`!

```json
{
  "title": "Thread Title",
  "slug": "abc123",
  "steps": [
    {
      "step_type": "INITIAL_QUERY",
      "query_str": "user question"
    },
    {
      "step_type": "FINAL",
      "final_response": "AI answer"
    }
  ]
}
```

**Fix Applied**:
- Changed `data.messages?.length` to `data.steps?.length`
- Updated filter from `t.messages` to `t.steps`
- Now correctly shows "✅ 5 steps" instead of "✅ 0 messages"

### 6. Additional Discoveries from Network Analysis

- **Thread List API**: `POST /rest/thread/list_ask_threads`
- **Pagination**: Uses `limit`, `offset`, `ascending` parameters
- **Authentication**: Cookie-based with `pplx.session-id`, `pplx.visitor-id`
- **Custom Headers**: `x-app-apiversion: 2.18`, `x-app-apiclient: default`
- **Cloudflare**: Direct API calls return challenge pages (confirmed browser approach)

## Final Implementation

### Files Created

1. **auto-export.js** (Puppeteer version)
   - Persistent browser profile
   - Manual navigation + auto-injection
   - Save location selector

2. **auto-export-playwright.js** (Playwright version - RECOMMENDED)
   - Auto-navigation to Library
   - Auto-scrolling to load all threads
   - Login detection
   - Save location selector
   - Better for codegen workflow

3. **package.json**
   - Configured as npm package
   - Bin commands: `perplexity-exporter`, `perplexity-export`
   - Dependencies: playwright, puppeteer-core
   - Scripts: `auto-export`, `auto-export-pw`, `codegen`

4. **.npmignore**
   - Excludes dev files, browser data, test scripts
   - Only ships essential files

5. **README.md**
   - npx usage instructions
   - Global install option
   - Local development setup
   - Publishing guide

6. **docs/network-analyzer-use-case.md**
   - Complete case study of using Network Analyzer MCP
   - Step-by-step analysis process
   - Key findings and learnings

### Usage

```bash
# Local development
node auto-export-playwright.js

# Or with npm script
npm run playwright

# Use Playwright codegen to record interactions
npm run codegen

# Once published to npm
npx perplexity-export
```

## Technical Highlights

### Auto-Scroll Implementation
```javascript
let previousHeight = 0;
while (scrollAttempts < maxScrollAttempts) {
  const currentHeight = await page.evaluate(() => document.body.scrollHeight);
  if (currentHeight === previousHeight) break;
  
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  
  previousHeight = currentHeight;
  scrollAttempts++;
}
```

### Export Script Injection
Runs in browser context to access authenticated session:
```javascript
const result = await page.evaluate(async () => {
  // Scrape thread links
  const threadElements = document.querySelectorAll('a[href*="/search/"]');
  
  // Fetch details for each
  for (let thread of threads) {
    const response = await fetch(`https://www.perplexity.ai/rest/thread/${thread.slug}`);
    const data = await response.json();
    // ...
  }
});
```

## Lessons Learned

1. **Browser automation beats direct API calls** when dealing with modern auth
2. **Playwright > Puppeteer** for interactive automation workflows
3. **Network Analyzer MCP is invaluable** for API discovery
4. **Data structure matters** - always verify actual API responses
5. **User experience first** - file save locations, auto-scrolling, clear prompts

## Next Steps (Potential)

- Publish to npm registry
- Add collection export support
- Implement export to different formats (CSV, Markdown)
- Add filtering/search before export
- Rate limiting and retry logic
- Progress bars for large exports

## Tools & Technologies

- **Playwright** - Browser automation
- **Puppeteer** - Alternative browser automation
- **Node.js** - Runtime
- **Network Analyzer MCP** - API discovery
- **npm** - Package management

## Success Metrics

✅ Bypasses Cloudflare and authentication  
✅ Exports complete thread data with all steps  
✅ Auto-scrolls to load all threads  
✅ User-friendly file save location selection  
✅ Correct data structure (steps not messages)  
✅ Can be packaged and published to npm  
✅ Documented with real-world MCP use case
