// Blaxel configuration for Perplexity Exporter MCP Server
// https://docs.blaxel.ai

export default {
  name: 'perplexity-exporter',
  version: '1.0.0',
  description: 'MCP server for exporting Perplexity.ai threads',
  
  // MCP server configuration
  mcp: {
    enabled: true,
    transport: 'http', // Blaxel uses HTTP transport for MCP
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
  },

  // Runtime configuration
  runtime: {
    memory: 1024, // MB - increased for browser automation
    timeout: 600, // 10 minutes (max for Mk2 generation)
    environment: 'node',
  },

  // Environment variables (set in Blaxel dashboard)
  env: {
    PERPLEXITY_API_URL: 'https://www.perplexity.ai/api',
    MODAL_API_URL: '${MODAL_API_URL}', // Set in Blaxel dashboard
    NODE_ENV: 'production',
  },

  // Build configuration
  build: {
    entry: 'src/index.ts',
    outDir: 'dist',
    target: 'node',
  },

  // Dependencies (install Playwright browsers)
  install: [
    'npx playwright install chromium --with-deps',
  ],
};
