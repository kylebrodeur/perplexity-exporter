# Perplexity Thread Exporter

Export all your Perplexity chat threads using Playwright to capture and replay API requests.

## Setup

1. Install dependencies:

```bash
cd perplexity-exporter
npm install
npx playwright install chromium
```

## Step 1: Capture API Requests

First, we need to identify the API endpoints Perplexity uses:

```bash
npm run capture
```

This will:

1. Open a browser window
2. Navigate to Perplexity
3. Capture all network requests/responses

**What to do:**

1. Log in to your Perplexity account
2. Navigate to your threads/library page (usually `/collections` or similar)
3. Wait for threads to load
4. Scroll to load more threads if needed
5. Click on one thread to open it and see the detail view
6. Press `Ctrl+C` in the terminal when done

The script will save two files:

- `captured-requests.json` - All API requests
- `captured-responses.json` - All API responses

## Step 2: Analyze Captured Data

Open `captured-responses.json` and look for:

1. **List threads endpoint**: Look for responses containing arrays of thread objects
   - Usually includes thread IDs, titles, timestamps
   - Example path: `/api/threads`, `/api/library`, etc.

2. **Get thread detail endpoint**: Look for responses with full thread content
   - Usually includes messages, queries, answers
   - Example path: `/api/thread/{id}`, `/api/chat/{id}`, etc.

3. **Authentication headers**: Check `captured-requests.json` for headers like:
   - `Authorization`
   - `Cookie`
   - `X-*` custom headers

## Step 3: Update Export Script

Edit `export-threads.js` and update:

1. `API_ENDPOINTS` object with the discovered endpoints
2. `AUTH_HEADERS` object with required authentication headers
3. The thread fetching logic based on the API structure

## Step 4: Export All Threads

Once the script is updated:

```bash
npm run export
```

This will:

1. Open a browser and wait for you to log in
2. Fetch all threads from the list endpoint
3. Download each thread's full content
4. Save to `exported-threads/` directory

## Output

Threads will be saved in `exported-threads/`:

- `all-threads.json` - Combined file with all threads
- `{thread-id}.json` - Individual files for each thread

## Troubleshooting

If capture isn't working:

- Make sure you're logged in to Perplexity
- Check browser console for errors (F12)
- Try scrolling slowly on the threads page
- Look for XHR/Fetch requests in the Network tab

If export isn't working:

- Verify the API endpoints are correct
- Check that authentication headers are properly set
- Ensure the thread data structure matches what you captured

## Notes

- Be respectful of rate limits
- The script adds delays between requests
- Export may take a while if you have many threads
