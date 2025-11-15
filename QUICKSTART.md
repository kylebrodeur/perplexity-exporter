# Quick Start Guide

## Overview

This tool helps you export all your Perplexity chat threads by:
1. Capturing network requests to discover API endpoints
2. Analyzing the captured data
3. Automatically generating an export script
4. Downloading all your threads

## Step-by-Step Instructions

### 1. Capture Network Requests (5-10 minutes)

```bash
npm run capture
```

**What happens:**
- Browser opens to Perplexity.ai
- You log in normally
- All network requests are recorded

**What you need to do:**
1. Log in to your Perplexity account
2. Go to your threads/library page (usually `/collections`)
3. Wait for threads to load
4. Scroll down if you have many threads
5. **Click on one thread** to open it (important!)
6. Press `Ctrl+C` in the terminal

**Output:** `captured-requests.json` and `captured-responses.json`

---

### 2. Analyze Captured Data (1 minute)

```bash
npm run analyze
```

**What happens:**
- Automatically identifies API endpoints
- Finds authentication headers
- Provides recommendations

**Output:** 
- Console shows discovered endpoints
- `analysis.json` saved with full details

---

### 3. Configure Export Script (2 minutes)

```bash
npm run configure
```

**What happens:**
- Interactive prompts guide you through configuration
- Automatically generates a working export script

**You'll need to provide:**
- List threads endpoint (from analysis)
- Thread detail endpoint (from analysis)
- Response structure (property names)

**Output:** `export-threads-configured.js`

---

### 4. Export Your Threads (depends on thread count)

```bash
node export-threads-configured.js
```

**What happens:**
- Opens browser for authentication
- Fetches list of all threads
- Downloads each thread's full content
- Saves to `exported-threads/` directory

**Output:**
- `exported-threads/all-threads.json` - Combined file
- `exported-threads/{thread-id}.json` - Individual files

---

## Troubleshooting

### "No threads found"
- Make sure you navigated to the threads page during capture
- Check that you scrolled to load threads
- Verify the endpoint path in `analysis.json`

### "Authentication failed"
- The session may have expired
- Try re-running the capture step
- Check if cookies/auth headers are needed

### "Browser not installed"
```bash
npx playwright install chromium
```

---

## File Overview

| File | Purpose |
|------|---------|
| `capture-requests.js` | Records network activity |
| `analyze-capture.js` | Identifies API endpoints |
| `configure-export.js` | Generates export script |
| `export-threads-configured.js` | Downloads all threads |
| `captured-requests.json` | Raw request data |
| `captured-responses.json` | Raw response data |
| `analysis.json` | Analyzed endpoints |
| `exported-threads/` | Your downloaded threads |

---

## Tips

- **Be patient**: The export may take a while if you have many threads
- **Rate limiting**: The script adds delays between requests
- **Check progress**: Console shows which thread is being downloaded
- **Backup**: The original `export-threads.js` is a template you can fall back to

---

## Need Help?

1. Check `captured-responses.json` to see actual API responses
2. Look at `analysis.json` for endpoint recommendations
3. The console output shows detailed progress during export
