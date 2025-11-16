# Perplexity Exporter

Export your Perplexity.ai conversation threads with full details including messages, sources, and citations.

## Quick Start

```bash
# Install dependencies
npm install

# Run the exporter
node auto-export.js
```

## How It Works

1. Opens Chrome with your persistent browser profile (maintains login session)
2. You navigate to Perplexity Library and load your threads
3. Press ENTER when ready
4. Script automatically injects and runs export code in the browser
5. Fetches full thread details from Perplexity's API
6. Saves timestamped JSON file with all conversation data

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
