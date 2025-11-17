/**
 * Known Perplexity API endpoints extracted from network analysis
 */
export const PERPLEXITY_ENDPOINTS = {
  BASE_URL: 'https://www.perplexity.ai',
  API_BASE: 'https://www.perplexity.ai/api',

  // Thread endpoints
  LIST_ALL_THREADS: 'rest/thread/list_ask_threads',
  GET_THREAD_DETAIL: (slug: string) => `rest/thread/${slug}`,

  // Collection endpoints
  LIST_USER_COLLECTIONS: 'rest/collections/list_user_collections',
  GET_COLLECTION_DETAIL: (uuid: string) => `rest/collections/get_collection?uuid=${uuid}`,

  // Bookmark endpoints (optional)
  LIST_BOOKMARKS: 'rest/bookmarks/list_user_bookmarks',
} as const;

/**
 * Build full URL for an API endpoint
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string | number>): string {
  const baseUrl = `${PERPLEXITY_ENDPOINTS.API_BASE}/${endpoint}`;

  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.append(key, String(value));
  }

  return `${baseUrl}?${searchParams.toString()}`;
}
