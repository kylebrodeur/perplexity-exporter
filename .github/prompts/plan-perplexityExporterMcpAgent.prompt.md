# Plan: Perplexity Exporter MCP Agent with Blaxel + Modal

## Overview

Transform the existing Playwright-based Perplexity exporter into an MCP (Model Context Protocol) agent for a hackathon. The solution will leverage both **Blaxel** (for MCP server and agent orchestration) and **Modal** (for serverless compute and parallel processing).

## Current State

- Working TypeScript/Playwright exporter that:
  - Auto-navigates to Perplexity Library
  - Auto-scrolls to load all threads
  - Fetches thread details via API
  - Exports to JSON with user-selected location
- Browser automation with persistent sessions (maintains login)
- Sequential thread fetching (can be slow for large libraries)

## Architecture Recommendation

```
┌─────────────────────────────────────────────┐
│  Blaxel MCP Agent (TypeScript)              │
│  - MCP protocol handlers                    │
│  - Stateful agent orchestration             │
│  - Session management                       │
│  - Native MCP integration                   │
└────────┬────────────────────────────────────┘
         │
         ├─► Tool: export_perplexity_threads
         │   └─► Option A: Blaxel (if long-running supported)
         │   └─► Option B: Modal worker (for parallelization)
         │
         ├─► Tool: list_perplexity_threads
         │   └─► Blaxel (quick API calls)
         │
         ├─► Tool: get_thread_detail
         │   └─► Blaxel (single thread fetch)
         │
         ├─► Tool: search_threads
         │   └─► Blaxel state (in-memory search)
         │
         ├─► Tool: analyze_threads
         │   └─► Modal (with GPU for AI analysis)
         │
         └─► Resource: perplexity://threads/*
             └─► Blaxel storage or Modal Volume
```

## Blaxel Capabilities (RESEARCHED)

### ✅ Confirmed Features

1. **MCP Server Support**
   - ✅ Native MCP support with streamable HTTP transport (November 2025)
   - ✅ Global endpoints: `https://run.blaxel.ai/{workspace}/functions/{name}/mcp`
   - ✅ Supports both Python and TypeScript
   - ✅ Custom Dockerfile support for dependencies
   - ✅ Memory: 512MB-1024MB configurable

2. **Timeout Limits** ⚠️ CRITICAL CONSTRAINT
   - ⏱️ **Hard limit: 15 minutes maximum**
   - ⏱️ Mk2 generation default: 10 minutes
   - ⚠️ **YOUR EXPORT TAKES 5-30 MINUTES** → Exceeds Blaxel capacity
   - 💡 Must use Modal for long-running operations

3. **Browser Automation Support**
   - ✅ Full Node.js environment with custom Dockerfile
   - ✅ Can install Playwright/Puppeteer via `npm install`
   - ✅ Container-based execution with system dependencies
   - ✅ Example Dockerfile provided in docs

4. **Agent Framework Support** (Optional)
   - Supports: LangChain, LangGraph, CrewAI, Mastra, OpenAI Agents, PydanticAI, Google ADK
   - **NOT NEEDED** for MCP server (you're building tools, not orchestrating)
   - Vanilla TypeScript is sufficient

5. **State Management**
   - No built-in persistent storage between MCP calls
   - Use Modal Volumes for long-term storage
   - Sandboxes available for ephemeral compute with sub-25ms cold starts

6. **SDK Features**
   - `blModel()` - Connect to LLM providers
   - `blTools()` - Connect to other MCP servers
   - Automatic telemetry and observability
   - Multi-framework tool conversion

## Recommended Architecture (CONFIRMED)

### ⭐ Scenario B: Hybrid Blaxel MCP + Modal Workers (RECOMMENDED)

**Why**: Blaxel's 15-minute timeout cannot handle 5-30 minute exports

**Architecture**: 
- ✅ **Blaxel MCP Server**: Lightweight orchestration, quick operations, MCP protocol
- ✅ **Modal Workers**: Long-running Playwright automation (30+ min timeout), parallel processing
- **Pro**: Best performance, native MCP integration, scales well, unlimited execution time
- **Con**: Two platforms (but simpler than alternatives)

```
┌─────────────────────────────────────────┐
│ Claude Desktop (User)                    │
│ "Export all my Perplexity threads"      │
└──────────────┬──────────────────────────┘
               │ MCP Protocol (HTTP)
┌──────────────▼──────────────────────────┐
│ Blaxel MCP Server (TypeScript)          │
│ https://run.blaxel.ai/kylebrodeur/...   │
│                                          │
│ Tools:                                   │
│ • export_perplexity_threads → Modal     │
│ • list_perplexity_threads → Blaxel      │
│ • get_thread_detail → Blaxel/Modal      │
│ • search_threads → Modal Volume          │
│ • analyze_threads → Modal (GPU)         │
└──────────────┬──────────────────────────┘
               │ HTTP API
┌──────────────▼──────────────────────────┐
│ Modal Python Workers                     │
│ • export_threads_parallel() - 30+ min   │
│ • analyze_with_gpu() - GPU inference    │
│ • Modal.Volume for persistence          │
└──────────────────────────────────────────┘
```

### Alternative Options (Not Recommended)

**Option A**: Pure Modal Implementation
- Port entire TypeScript codebase to Python
- Deploy MCP server on Modal web endpoint
- **Con**: Lose existing TypeScript code, more work

**Option C**: Local MCP Server (stdio)
- Run TypeScript MCP server locally
- Skip cloud deployment entirely
- **Con**: Not accessible to cloud AI assistants, defeats hackathon purpose

## Implementation Plan

### Phase 1: Project Setup (30 min)

1. **✅ Research Complete** - Findings:
   - Blaxel: 15-min timeout, MCP support, TypeScript/Python, Custom Dockerfile
   - Modal: 30+ min timeout, Function.map() parallelization, GPU support
   - Architecture: Hybrid approach required

2. **Set Up Project Structure**
   ```
   perplexity-exporter/
   ├── mcp-server/              # Blaxel deployment
   │   ├── src/
   │   │   ├── index.ts         # MCP server entry
   │   │   ├── tools/           # MCP tool handlers
   │   │   ├── resources/       # MCP resource providers
   │   │   └── types/
   │   ├── blaxel.config.js     # Blaxel config
   │   └── package.json
   │
   ├── modal-workers/           # Modal deployment (if needed)
   │   ├── playwright_export.py
   │   ├── parallel_fetch.py
   │   └── requirements.txt
   │
   ├── shared/                  # Shared types
   │   ├── types.ts
   │   └── schemas.json
   │
   └── src/                     # Current CLI code
       └── index.ts
   ```

### Phase 2: Extract Core Services (1 hour)

Refactor existing code into reusable services:

1. **BrowserManager.ts** (already exists)
   - Browser session management
   - Cookie handling
   - Navigation helpers

2. **PerplexityApiClient.ts**
   ```typescript
   class PerplexityApiClient {
     async listThreads(limit?: number): Promise<Thread[]>
     async getThreadDetail(slug: string): Promise<ThreadDetail>
     async fetchAllThreads(): Promise<Thread[]>
   }
   ```

3. **ThreadExporter.ts**
   ```typescript
   class ThreadExporter {
     async exportAll(options: ExportOptions): Promise<ExportResult>
     async exportParallel(slugs: string[]): Promise<ExportResult>
   }
   ```

### Phase 3: Build Blaxel MCP Server (2 hours)

1. **Install MCP SDK**
   ```bash
   cd mcp-server
   npm install @modelcontextprotocol/sdk
   npm install playwright # if Blaxel supports it
   ```

2. **Create MCP Server** (`mcp-server/src/index.ts`)
   ```typescript
   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
   
   const server = new Server({
     name: 'perplexity-exporter',
     version: '1.0.0',
   }, {
     capabilities: {
       tools: {},
       resources: {},
     },
   });
   ```

3. **Define MCP Tools**
   - `export_perplexity_threads` - Full export with all threads
   - `list_perplexity_threads` - List threads (no full details)
   - `get_thread_detail` - Single thread by slug
   - `search_threads` - Search by query in cached data
   - `analyze_threads` - AI analysis (calls Modal if needed)

4. **Define MCP Resources**
   - `perplexity://threads/all` - All exported threads
   - `perplexity://thread/{slug}` - Individual thread data
   - `perplexity://exports/recent` - Recent export history

### Phase 4: Modal Workers (REQUIRED, 1-2 hours)

**Required because**: Blaxel 15-min timeout cannot handle long exports. Modal workers handle:

1. **Parallel Thread Fetching**
   ```python
   @app.function(timeout=30*60)
   def export_threads_parallel(thread_slugs: list[str]):
       results = fetch_thread.map(thread_slugs)
       return results
   ```

2. **AI Analysis with GPU**
   ```python
   @app.function(gpu="T4")
   def analyze_thread_content(threads: list[dict]):
       # Summarization, topic extraction, etc.
       pass
   ```

3. **Storage with Modal Volume**
   ```python
   volume = modal.Volume.from_name("perplexity-exports")
   
   @app.function(volumes={"/data": volume})
   def store_export(data: dict):
       # Persist exports
       pass
   ```

### Phase 5: Testing & Integration (1 hour)

1. **Test Locally**
   ```bash
   # Test MCP server
   cd mcp-server
   npm run dev
   
   # Test with MCP inspector
   npx @modelcontextprotocol/inspector
   ```

2. **Deploy to Blaxel**
   ```bash
   cd mcp-server
   bl deploy  # Blaxel CLI command
   ```

3. **Configure Claude Desktop**
   ```json
   {
     "mcpServers": {
       "perplexity-exporter": {
         "url": "https://run.blaxel.ai/kylebrodeur/functions/perplexity-exporter/mcp",
         "type": "http"
       }
     }
   }
   ```

4. **Test End-to-End**
   - Ask Claude: "Export my Perplexity threads"
   - Ask Claude: "Search my threads for AI topics"
   - Ask Claude: "Summarize my most recent threads"

### Phase 6: Demo Preparation (30 min)

1. **Create Demo Script**
   - Pre-record video showing MCP integration
   - Prepare live demo with sample commands
   - Show before/after comparison

2. **Highlight Features**
   - Natural language → function calls
   - Progress tracking in real-time
   - AI analysis of exported content
   - Multi-platform architecture (Blaxel + Modal)

3. **Prepare Pitch**
   - Problem: Manual export is tedious
   - Solution: AI-powered MCP agent
   - Tech: Blaxel for orchestration, Modal for compute
   - Demo: Live interaction with Claude

## MCP Tool Definitions

### Tool: export_perplexity_threads

```typescript
{
  name: 'export_perplexity_threads',
  description: 'Export all Perplexity.ai threads with full conversation history',
  inputSchema: {
    type: 'object',
    properties: {
      outputPath: {
        type: 'string',
        description: 'Path to save exported threads (optional)',
      },
      includeSteps: {
        type: 'boolean',
        description: 'Include full conversation steps',
        default: true,
      },
      maxThreads: {
        type: 'number',
        description: 'Maximum number of threads to export',
        default: 1000,
      },
    },
  },
}
```

### Tool: list_perplexity_threads

```typescript
{
  name: 'list_perplexity_threads',
  description: 'List all available Perplexity threads (metadata only)',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of threads to list',
        default: 100,
      },
    },
  },
}
```

### Tool: get_thread_detail

```typescript
{
  name: 'get_thread_detail',
  description: 'Get detailed information about a specific thread',
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: 'Thread slug/ID',
      },
    },
    required: ['slug'],
  },
}
```

### Tool: search_threads

```typescript
{
  name: 'search_threads',
  description: 'Search through exported threads by query',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      field: {
        type: 'string',
        enum: ['title', 'content', 'all'],
        default: 'all',
      },
    },
    required: ['query'],
  },
}
```

### Tool: analyze_threads

```typescript
{
  name: 'analyze_threads',
  description: 'AI-powered analysis of thread content',
  inputSchema: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        enum: ['summarize', 'topics', 'sentiment', 'keywords'],
        default: 'summarize',
      },
      threadSlugs: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific threads to analyze (optional)',
      },
    },
  },
}
```

## MCP Resource Definitions

### Resource: perplexity://threads/all

```typescript
{
  uri: 'perplexity://threads/all',
  name: 'All Perplexity Threads',
  description: 'Complete list of all exported threads with full data',
  mimeType: 'application/json',
}
```

### Resource: perplexity://thread/{slug}

```typescript
{
  uri: 'perplexity://thread/{slug}',
  name: 'Individual Thread',
  description: 'Full conversation history for a specific thread',
  mimeType: 'application/json',
}
```

## Success Metrics

- ✅ MCP server deployed and accessible
- ✅ Claude Desktop can invoke tools
- ✅ Export works end-to-end via natural language
- ✅ Search functionality works on cached data
- ✅ Progress tracking visible to user
- ✅ Demo ready with prepared commands
- ✅ Architecture diagram for judges

## Alternative Approaches

### If Time-Constrained:

**Option 1**: Blaxel MCP with Async Jobs
- Blaxel MCP returns job ID immediately
- Modal worker runs in background
- Poll for completion via separate tool
- **Pro**: Fits within MCP request/response model

**Option 2**: Simplified Feature Set
- Only implement quick operations on Blaxel (<15 min)
- `list_threads` - List metadata only
- `get_thread_detail` - Single thread fetch
- Skip full export for demo
- **Pro**: Fastest to build, demonstrates MCP concept

**Option 3**: Local MCP + Modal Workers
- Run MCP server locally (stdio transport)
- Dispatch to Modal for heavy lifting
- Configure in Claude Desktop directly
- **Pro**: Simpler deployment, keeps TypeScript

## Time Estimates

### Recommended Path (Blaxel MCP + Modal)
- Phase 1: Setup (30 min) ✅ Research complete
- Phase 2: Extract services (1 hour)
- Phase 3: Blaxel MCP server (2 hours)
- Phase 4: Modal workers (1.5 hours) - REQUIRED
- Phase 5: Testing & integration (1 hour)
- Phase 6: Demo prep (30 min)

**Total**: 6.5 hours

### Minimal Demo (Quick operations only)
- Phase 1-3: Blaxel MCP (2.5 hours)
- Skip Modal, implement only fast tools
- Testing & demo (1 hour)

**Total**: 3.5 hours

### Key Decision Point
- With Modal: Full functionality, impressive demo, production-ready
- Without Modal: Quick demo, limited features, shows MCP concept only

## Next Steps (START HERE)

1. ✅ **Research Complete** - Blaxel capabilities confirmed
2. ✅ **Architecture Decided** - Hybrid Blaxel MCP + Modal Workers
3. **Create Project Structure** - Set up mcp-server/ and modal-workers/ directories
4. **Extract Core Services** - Refactor existing code into shared modules
5. **Build Blaxel MCP Server** - Implement MCP protocol with tool handlers
6. **Create Modal Workers** - Python functions for long-running operations
7. **Deploy & Test** - Push to both platforms and configure Claude Desktop
8. **Prepare Demo** - Script, video, and live commands ready

### Immediate Action
```bash
# Initialize Blaxel MCP server
cd perplexity-exporter
mkdir -p mcp-server/src/{tools,resources,types}
cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk playwright

# Initialize Modal workers
mkdir -p modal-workers
cd modal-workers
pip install modal playwright
```

## Demo Commands for Claude

```
"Export all my Perplexity threads and save them"

"List my recent Perplexity threads"

"Search my threads for topics about AI and machine learning"

"Get the full conversation from my thread about MCP protocol"

"Analyze my threads and tell me what topics I research most"

"Export my threads and create a markdown summary organized by topic"
```
