# Perplexity Exporter

[![CI](https://github.com/kylebrodeur/perplexity-exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/kylebrodeur/perplexity-exporter/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/perplexity-exporter.svg)](https://www.npmjs.com/package/perplexity-exporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Export all of your [Perplexity.ai](https://www.perplexity.ai) conversation threads to JSON, preserving the full back-and-forth conversation history including sources.

## How It Works

1. Opens a persistent Chromium browser window (so your login session is saved between runs)
2. Navigates to your Perplexity Library and auto-scrolls to load all threads
3. Fetches full conversation details for each thread via the Perplexity API (using your browser cookies)
4. Saves everything to a timestamped JSON file of your choosing

## Requirements

- Node.js 18+
- A [Perplexity.ai](https://www.perplexity.ai) account

## Quick Start (no install)

```bash
npx perplexity-exporter
# or
pnpm dlx perplexity-exporter
```

> **First run:** Chromium will be downloaded automatically (~150 MB, one-time setup).

## Usage (from source)

```bash
# Clone and install
git clone https://github.com/kylebrodeur/perplexity-exporter.git
cd perplexity-exporter
pnpm install
npx playwright install chromium

# Build and run
pnpm build
node dist/index.js
```

### First run

On the first run a browser window will open. Log in to Perplexity.ai if prompted, then press **Enter** in the terminal to begin the export.

Your session is saved to `browser-data-playwright/` so subsequent runs start already logged in.

## Output Format

Exports a JSON array of thread objects:

```json
[
  {
    "slug": "abc123",
    "title": "How does RLHF work?",
    "steps": [
      {
        "step_type": "INITIAL_QUERY",
        "query_str": "How does RLHF work?",
        "final_response": "RLHF (Reinforcement Learning from Human Feedback)..."
      }
    ]
  }
]
```

Each `steps` array entry represents one turn of the conversation.

## Notes

- **Rate limiting**: The exporter adds small delays between requests (~350ms) to avoid hammering the API.
- **Large libraries**: Auto-scroll handles infinite-scroll pagination. Very large libraries (1000+ threads) may take several minutes.
- **Re-running**: Each run creates a new timestamped file — existing exports are never overwritten.
- **`browser-data-playwright/`** stores your login session locally. It is gitignored and should never be committed.

## License

MIT

