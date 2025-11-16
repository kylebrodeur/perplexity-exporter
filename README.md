# Perplexity Exporter

Export your Perplexity.ai conversation threads with full details including messages, sources, and citations.

## Quick Start

### Option 1: Run with npx (No Installation)

```bash
npx perplexity-exporter
```

Or use the shorter alias:

```bash
npx perplexity-export
```

### Option 2: Install Globally

```bash
npm install -g perplexity-exporter

# Then run anytime
perplexity-export
```

### Option 3: Clone and Run Locally

```bash
# Clone the repo
git clone https://github.com/yourusername/perplexity-exporter.git
cd perplexity-exporter

# Install dependencies
npm install

# Run the exporter
node auto-export.js
# or
npm run auto-export
```

## How It Works

The script will:
1. Open Chrome with your persistent browser profile (maintains login session)
2. Wait for you to navigate to Perplexity Library and load your threads
3. Ask you to press ENTER when ready
4. Automatically inject and run export code in the browser
5. Fetch full thread details from Perplexity's API
6. Ask where you want to save the export file:
   - Current folder
   - Home folder
   - Desktop
   - Custom path
7. Save timestamped JSON file with all conversation data

## Features

✅ **Bypasses Authentication**: Uses your real browser session  
✅ **Complete Data**: Full conversation history with user/assistant messages  
✅ **Rich Metadata**: Includes sources, citations, web results, and media  
✅ **No Manual Copy/Paste**: Fully automated after initial navigation  
✅ **Timestamped Exports**: Each export saved with timestamp  
✅ **Flexible Save Locations**: Choose where to save your exports

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

## Publishing to npm

To publish this package to npm:

```bash
# 1. Build the TypeScript
npm run build

# 2. Login to npm (if not already)
npm login

# 3. Publish
npm publish
```

To update the version:

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish
```

## License

MIT
