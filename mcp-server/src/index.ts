#!/usr/bin/env node

/**
 * Perplexity Exporter MCP Server
 * 
 * An MCP (Model Context Protocol) server that enables AI assistants to export
 * and analyze Perplexity.ai conversation threads.
 * 
 * Features:
 * - List all Perplexity threads
 * - Export threads with full conversation history
 * - Search exported threads
 * - Analyze thread content with AI
 * 
 * Architecture:
 * - Blaxel MCP Server: Handles quick operations (<15 min)
 * - Modal Workers: Handles long-running exports and parallel processing
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tools (to be created)
// import { listThreadsTool } from './tools/list-threads.js';
// import { getThreadDetailTool } from './tools/get-thread-detail.js';
// import { exportThreadsTool } from './tools/export-threads.js';
// import { searchThreadsTool } from './tools/search-threads.js';
// import { analyzeThreadsTool } from './tools/analyze-threads.js';

// Import resources (to be created)
// import { threadsResource } from './resources/threads.js';
// import { threadResource } from './resources/thread.js';

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: 'perplexity-exporter',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_perplexity_threads',
        description: 'List all available Perplexity.ai threads with metadata (title, date, model)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of threads to list (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_thread_detail',
        description: 'Get detailed information about a specific Perplexity thread including full conversation',
        inputSchema: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              description: 'Thread slug/ID from Perplexity',
            },
          },
          required: ['slug'],
        },
      },
      {
        name: 'export_perplexity_threads',
        description: 'Export all Perplexity threads with full conversation history (may take several minutes for large libraries)',
        inputSchema: {
          type: 'object',
          properties: {
            outputPath: {
              type: 'string',
              description: 'Optional path to save exported threads',
            },
            includeSteps: {
              type: 'boolean',
              description: 'Include full conversation steps (default: true)',
              default: true,
            },
            maxThreads: {
              type: 'number',
              description: 'Maximum number of threads to export (default: 1000)',
              default: 1000,
            },
          },
        },
      },
      {
        name: 'search_threads',
        description: 'Search through exported Perplexity threads by query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text',
            },
            field: {
              type: 'string',
              enum: ['title', 'content', 'all'],
              description: 'Field to search in (default: all)',
              default: 'all',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
              default: 20,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'analyze_threads',
        description: 'AI-powered analysis of thread content (summarization, topic extraction, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['summarize', 'topics', 'sentiment', 'keywords'],
              description: 'Type of analysis to perform',
              default: 'summarize',
            },
            threadSlugs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific thread slugs to analyze (optional, analyzes all if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of threads to analyze (default: 50)',
              default: 50,
            },
          },
        },
      },
    ],
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_perplexity_threads':
        // TODO: Implement list threads logic
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'list_perplexity_threads not yet implemented',
                args,
              }, null, 2),
            },
          ],
        };

      case 'get_thread_detail':
        // TODO: Implement get thread detail logic
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'get_thread_detail not yet implemented',
                args,
              }, null, 2),
            },
          ],
        };

      case 'export_perplexity_threads':
        // TODO: Implement export threads logic (dispatch to Modal)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'export_perplexity_threads not yet implemented',
                args,
              }, null, 2),
            },
          ],
        };

      case 'search_threads':
        // TODO: Implement search threads logic
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'search_threads not yet implemented',
                args,
              }, null, 2),
            },
          ],
        };

      case 'analyze_threads':
        // TODO: Implement analyze threads logic (dispatch to Modal with GPU)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'analyze_threads not yet implemented',
                args,
              }, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Handler for listing available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'perplexity://threads/all',
        name: 'All Perplexity Threads',
        description: 'Complete list of all exported threads with full conversation data',
        mimeType: 'application/json',
      },
      {
        uri: 'perplexity://thread/{slug}',
        name: 'Individual Thread',
        description: 'Full conversation history for a specific thread',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * Handler for reading resources
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // TODO: Implement resource reading logic
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          message: 'Resource reading not yet implemented',
          uri,
        }, null, 2),
      },
    ],
  };
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Perplexity Exporter MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
