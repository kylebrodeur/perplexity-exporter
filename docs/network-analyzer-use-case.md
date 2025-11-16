# Network Analyzer MCP Use Case: Perplexity Exporter

## Overview

This document describes how the Network Analyzer MCP (Model Context Protocol) was used to reverse-engineer the Perplexity.ai API structure for building an automated thread exporter.

## Problem Statement

We needed to:
1. Understand Perplexity's internal API endpoints
2. Identify the correct data structure for thread exports
3. Determine authentication requirements (cookies, headers)
4. Fix issues with displaying thread data (steps vs messages)

## Solution: Network Analyzer MCP

### Step 1: Capture Network Traffic

We used the `capture_network_requests` tool to intercept all network requests when loading the Perplexity Library page:

```javascript
mcp_network-analy_capture_network_requests({
  ignoreStaticAssets: true,
  sessionId: "perplexity-library-capture",
  url: "https://www.perplexity.ai/library",
  waitForNetworkIdleMs: 3000
})
```

**Results:**
- 145 total requests captured
- 17 API endpoints discovered
- Key endpoint identified: `POST /rest/thread/list_ask_threads`
- Authentication method detected: Cookie-based
- 10 cookies identified including `pplx.session-id`, `pplx.visitor-id`

### Step 2: Analyze Captured Data

We analyzed the captured traffic to extract patterns:

```javascript
mcp_network-analy_analyze_captured_data({
  captureId: "perplexity-library-capture",
  includeStaticAssets: false
})
```

**Key Findings:**
- Thread list endpoint: `POST /rest/thread/list_ask_threads?version=2.18&source=default`
- Request body structure:
  ```json
  {
    "limit": 20,
    "ascending": false,
    "offset": 0,
    "search_term": ""
  }
  ```
- Custom headers required:
  - `x-app-apiclient: default`
  - `x-app-apiversion: 2.18`
  - `x-perplexity-request-endpoint`
  - `x-perplexity-request-reason`
  - `x-perplexity-request-try-number`

### Step 3: Inspect Response Structure

By examining the captured data, we discovered:

**Thread Detail API:**
- Endpoint: `GET /rest/thread/{slug}`
- Response structure uses `steps` array, NOT `messages`:
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

### Step 4: Fix Implementation

Armed with the correct data structure, we fixed the export scripts:

**Before:**
```javascript
log.push(`  ✅ ${data.messages?.length || 0} messages`);
```

**After:**
```javascript
log.push(`  ✅ ${data.steps?.length || 0} steps`);
```

## Benefits of Using Network Analyzer MCP

### 1. **Authentication Discovery**
- Identified that Perplexity uses cookie-based auth
- No need for API keys or bearer tokens
- Can use persistent browser sessions

### 2. **API Structure Discovery**
- Found all REST endpoints without documentation
- Identified pagination parameters (limit, offset)
- Discovered required custom headers

### 3. **Data Model Understanding**
- Revealed the correct field names (`steps` not `messages`)
- Showed the structure of INITIAL_QUERY and FINAL step types
- Helped build accurate exporters

### 4. **Cloudflare Detection**
- Showed that direct API calls trigger Cloudflare challenges
- Confirmed need for browser automation approach
- Validated using authenticated browser sessions

## Implementation Results

Based on the MCP analysis, we built two export scripts:

### 1. Puppeteer Version (`auto-export.js`)
- Uses persistent browser profile
- Bypasses Cloudflare by running in real browser context
- Injects JavaScript to call APIs from authenticated session

### 2. Playwright Version (`auto-export-playwright.js`)
- Auto-navigates to Library page
- Auto-scrolls to load all threads
- Uses Playwright's superior automation capabilities
- Supports codegen for future enhancements

## Key Learnings

1. **MCP Tools Save Time**: Instead of manually inspecting network tabs and guessing API structures, the MCP tool automated the entire discovery process.

2. **Cookie Persistence is Critical**: The captured session data showed that cookies like `pplx.session-id` must be maintained across requests.

3. **Cloudflare is a Challenge**: The captured responses showed Cloudflare challenge pages, confirming that browser automation is the right approach.

4. **Data Structure Matters**: Finding that Perplexity uses `steps` instead of `messages` was crucial for displaying correct thread counts.

## Files Generated from This Analysis

1. `auto-export.js` - Puppeteer-based exporter
2. `auto-export-playwright.js` - Playwright-based exporter with auto-scroll
3. `package.json` - Updated with correct dependencies
4. This documentation

## Future Enhancements Using Network Analyzer

Potential uses for continued API discovery:

1. **Collection Export**: Analyze the collections API endpoints
2. **Search Functionality**: Understand search parameters and filters
3. **Rate Limiting**: Identify rate limit headers and backoff requirements
4. **Pagination Patterns**: Discover if there are cursor-based pagination options

## Conclusion

The Network Analyzer MCP proved invaluable for reverse-engineering Perplexity's API without official documentation. It enabled us to:
- Build a working exporter in hours instead of days
- Understand authentication requirements
- Fix data structure issues quickly
- Avoid common pitfalls like Cloudflare challenges

This use case demonstrates how MCP tools can accelerate development when working with undocumented APIs.

---

**Date**: November 15, 2025
**Project**: perplexity-exporter
**MCP Tool**: network-analyzer
**Result**: Successful automated thread export system
