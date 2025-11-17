// Shared types for Perplexity Exporter MCP Agent
// Used across MCP server and Modal workers

export interface Thread {
  slug: string;
  title: string;
  created_at: string;
  updated_at: string;
  model?: string;
  collection_uuid?: string;
}

export interface ThreadDetail extends Thread {
  steps: ConversationStep[];
  description?: string;
  tags?: string[];
  visibility?: 'private' | 'public';
}

export interface ConversationStep {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  sources?: Source[];
  followups?: string[];
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export interface ExportOptions {
  outputPath?: string;
  includeSteps?: boolean;
  maxThreads?: number;
  parallel?: boolean;
}

export interface ExportResult {
  success: boolean;
  threadCount: number;
  outputPath?: string;
  errors?: string[];
  duration?: number;
}

export interface SearchOptions {
  query: string;
  field?: 'title' | 'content' | 'all';
  limit?: number;
}

export interface SearchResult {
  threads: ThreadDetail[];
  count: number;
  query: string;
}

export interface AnalysisOptions {
  analysisType: 'summarize' | 'topics' | 'sentiment' | 'keywords';
  threadSlugs?: string[];
  limit?: number;
}

export interface AnalysisResult {
  type: string;
  summary?: string;
  topics?: string[];
  sentiment?: Record<string, number>;
  keywords?: Array<{ word: string; count: number }>;
}

// Modal worker request/response types
export interface ModalExportRequest {
  threadSlugs: string[];
  options: ExportOptions;
}

export interface ModalExportResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ExportResult;
  error?: string;
}
