# Perplexity Exporter

Export your Perplexity.ai conversation threads with full details including messages, sources, and citations.

## Quick Start

### Option 1: Standalone Script (Simplest)

```bash
# Install dependencies
npm install

# Run the exporter
node auto-export.js
```

The script will:
1. Open Chrome with your persistent browser profile (maintains login session)
2. Wait for you to navigate to Perplexity Library and load your threads
3. Ask you to press ENTER when ready
4. Automatically inject and run export code in the browser
5. Fetch full thread details from Perplexity's API
6. Save timestamped JSON file with all conversation data

### Option 2: TypeScript CLI (Connects to Running Chrome)

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Start Chrome with remote debugging (in a separate terminal)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# 4. Navigate to Perplexity Library in Chrome, log in, and load your threads

# 5. Run the exporter
node dist/cli.js export
```

The CLI will:
1. Connect to your already-running Chrome instance
2. Wait for you to press ENTER when ready
3. Inject and execute the export script
4. Save results to timestamped JSON file

## Features

✅ **Bypasses Authentication**: Uses your real browser session  
✅ **Complete Data**: Full conversation history with user/assistant messages  
✅ **Rich Metadata**: Includes sources, citations, web results, and media  
✅ **No Manual Copy/Paste**: Fully automated after initial navigation  
✅ **Timestamped Exports**: Each export saved with timestamp

## Output Format

Exports are saved as `perplexity-threads-{timestamp}.json` containing:

- User queries (INITIAL_QUERY steps)
- AI responses (FINAL steps with full answers)
- Search metadata (web queries, sources)
- Related queries and follow-ups
- Images and attachments
- Complete thread history

## Why This Approach?

Modern authentication (Google SSO, Cloudflare) effectively blocks browser automation even with sophisticated stealth measures. Running the export script directly in an authenticated browser context bypasses all detection while maintaining convenience.

## Technical Details

- Uses Puppeteer with persistent browser profile
- Fetches from `/rest/thread/{slug}` endpoint
- Exports to downloadable JSON blob
- Browser auto-closes after completion

## TypeScript Implementation

A TypeScript CLI implementation is available in `src/` for reference, including:
- Command system with Commander.js
- Browser automation framework
- Cookie management utilities

However, the JavaScript `auto-export.js` is the recommended approach due to authentication challenges.

## License

MIT
