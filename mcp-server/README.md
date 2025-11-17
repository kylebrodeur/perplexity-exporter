# Perplexity Exporter MCP Server

An MCP (Model Context Protocol) server that enables AI assistants like Claude to export and analyze Perplexity.ai conversation threads.

## Architecture

This MCP server runs on **Blaxel** and dispatches long-running operations to **Modal** workers:

- **Blaxel**: Quick operations (<10 min) - listing threads, single thread fetches
- **Modal**: Long-running operations (30+ min) - full exports, parallel processing, AI analysis

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # MCP tool implementations
│   │   ├── list-threads.ts
│   │   ├── get-thread-detail.ts
│   │   ├── export-threads.ts
│   │   ├── search-threads.ts
│   │   └── analyze-threads.ts
│   ├── resources/            # MCP resource providers
│   │   ├── threads.ts
│   │   └── thread.ts
│   └── types/                # Type definitions
│       └── index.ts
├── blaxel.config.js          # Blaxel deployment config
├── package.json
└── tsconfig.json
```

## Setup

### 1. Install Dependencies

```bash
cd mcp-server
pnpm install
```

### 2. Build

```bash
pnpm run build
```

### 3. Test Locally

```bash
# Run in development mode
pnpm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector
```

## Deployment

### Deploy to Blaxel

1. Install Blaxel CLI:
   ```bash
   npm install -g @blaxel/cli
   bl login
   ```

2. Deploy:
   ```bash
   bl deploy
   ```

3. Get MCP endpoint URL:
   ```
   https://run.blaxel.ai/{workspace}/functions/perplexity-exporter/mcp
   ```

### Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "perplexity-exporter": {
      "url": "https://run.blaxel.ai/{your-workspace}/functions/perplexity-exporter/mcp",
      "type": "http"
    }
  }
}
```

## Available Tools

### 1. `list_perplexity_threads`
List all available Perplexity threads with metadata.

**Parameters:**
- `limit` (optional): Maximum number of threads (default: 100)

### 2. `get_thread_detail`
Get detailed information about a specific thread.

**Parameters:**
- `slug` (required): Thread slug/ID

### 3. `export_perplexity_threads`
Export all threads with full conversation history (dispatches to Modal).

**Parameters:**
- `outputPath` (optional): Save location
- `includeSteps` (optional): Include conversation steps (default: true)
- `maxThreads` (optional): Maximum threads to export (default: 1000)

### 4. `search_threads`
Search through exported threads.

**Parameters:**
- `query` (required): Search query
- `field` (optional): Search field - 'title', 'content', or 'all' (default: 'all')
- `limit` (optional): Maximum results (default: 20)

### 5. `analyze_threads`
AI-powered thread analysis (dispatches to Modal with GPU).

**Parameters:**
- `analysisType` (optional): 'summarize', 'topics', 'sentiment', or 'keywords'
- `threadSlugs` (optional): Specific threads to analyze
- `limit` (optional): Maximum threads to analyze (default: 50)

## Available Resources

### `perplexity://threads/all`
Complete list of all exported threads with full conversation data.

### `perplexity://thread/{slug}`
Full conversation history for a specific thread.

## Environment Variables

Set these in the Blaxel dashboard:

- `PERPLEXITY_API_URL`: Perplexity API base URL (default: https://www.perplexity.ai/api)
- `MODAL_API_URL`: Modal worker endpoint URL
- `NODE_ENV`: Environment (production/development)

## Development

### Run in Watch Mode

```bash
pnpm run watch
```

### Run Tests

```bash
pnpm test
```

## Troubleshooting

### Timeout Issues
If operations take longer than 10 minutes, they should be dispatched to Modal workers. Check the implementation in `export-threads.ts`.

### Browser Automation
Playwright browsers are installed during deployment via the `install` script in `blaxel.config.js`.

### MCP Connection Issues
Test the MCP server locally first with the MCP Inspector before deploying to Blaxel.

## Next Steps

1. ✅ Project structure created
2. ⏳ Extract core services from existing CLI code
3. ⏳ Implement MCP tools
4. ⏳ Create Modal workers
5. ⏳ Test and deploy

See `../../.github/prompts/plan-perplexityExporterMcpAgent.prompt.md` for the full implementation plan.
