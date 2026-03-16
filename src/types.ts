export interface ThreadLink {
  id: string;
  title: string;
  url: string;
  slug: string;
}

export interface ThreadData {
  steps?: Array<{
    step_type: string;
    query_str?: string;
    final_response?: string;
  }>;
  [key: string]: unknown;
}

export interface ExportResult {
  success: boolean;
  log: string[];
  data?: ThreadData[];
  count?: number;
  successCount?: number;
  errorCount?: number;
  error?: string;
}
