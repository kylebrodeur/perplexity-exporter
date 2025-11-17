# Perplexity Exporter - Modal Workers

Modal workers handle long-running operations that exceed Blaxel's 15-minute timeout limit.

## Why Modal?

- **30+ minute timeouts**: Handle large exports that take 5-30 minutes
- **Parallel processing**: Use `Function.map()` to fetch threads in parallel
- **GPU support**: Optional AI analysis with GPU acceleration
- **Persistent storage**: Modal Volumes for export caching

## Architecture

```
Blaxel MCP Server → Modal Workers
   |
   ├─► export_threads_parallel()  [30+ min timeout]
   ├─► fetch_single_thread()      [parallel execution]
   ├─► analyze_with_gpu()         [GPU: T4/A10G]
   └─► store_export()             [Modal Volume]
```

## Workers

### 1. `export_threads_parallel()`
Orchestrates parallel thread fetching and export.

- Uses `Function.map()` for parallelization
- Handles browser automation with Playwright
- Stores results to Modal Volume
- Returns job status via HTTP endpoint

### 2. `fetch_single_thread()`
Fetches a single thread detail (mapped over many threads).

- Playwright browser automation
- Cookie-based authentication
- Retry logic for failures

### 3. `analyze_with_gpu()`
AI-powered thread analysis with GPU.

- Summarization
- Topic extraction
- Sentiment analysis
- Keyword extraction

### 4. `store_export()`
Persists export results to Modal Volume.

- JSON storage
- Compression for large exports
- Metadata indexing

## Setup

### 1. Install Modal

```bash
pip install modal
```

### 2. Authenticate

```bash
modal token new
```

### 3. Create Volume

```bash
modal volume create perplexity-exports
```

### 4. Deploy

```bash
cd modal-workers
modal deploy playwright_export.py
```

## Usage

### Call from MCP Server

```typescript
// In Blaxel MCP server
const response = await fetch(process.env.MODAL_API_URL + '/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    threadSlugs: ['slug1', 'slug2', ...],
    options: { includeSteps: true }
  })
});

const { jobId, status } = await response.json();
```

### Check Job Status

```bash
curl https://your-modal-app.modal.run/status/{jobId}
```

## Environment Variables

Set these as Modal secrets:

```bash
modal secret create perplexity-secrets \
  PERPLEXITY_API_URL=https://www.perplexity.ai/api \
  BROWSER_COOKIES="..."
```

## Development

### Test Locally

```bash
modal run playwright_export.py::test_export
```

### View Logs

```bash
modal app logs perplexity-exporter
```

### Interactive Shell

```bash
modal shell playwright_export.py
```

## Files

- `playwright_export.py` - Main export worker with Playwright automation
- `parallel_fetch.py` - Parallel thread fetching logic
- `gpu_analysis.py` - GPU-accelerated AI analysis (optional)
- `requirements.txt` - Python dependencies

## Performance

### Parallelization
- Sequential: ~30 min for 100 threads
- Parallel (10 workers): ~5 min for 100 threads

### Timeout Configuration
```python
@app.function(timeout=30*60)  # 30 minutes
def export_threads_parallel():
    pass
```

## Next Steps

1. ⏳ Implement `playwright_export.py`
2. ⏳ Implement `parallel_fetch.py`
3. ⏳ Set up Modal Volume storage
4. ⏳ Create HTTP endpoints for MCP server integration
5. ⏳ Test end-to-end with Blaxel MCP server

See `../.github/prompts/plan-perplexityExporterMcpAgent.prompt.md` for the full plan.
