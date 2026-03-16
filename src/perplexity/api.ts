import type { Page } from 'playwright';
import type { ThreadData, ThreadLink } from '../types.js';

export interface FetchThreadResult {
  data: ThreadData;
  stepCount: number;
}

/**
 * Fetches a single thread from the Perplexity REST API using the browser's
 * authenticated session (cookies are shared with the page context).
 *
 * Returns null on a non-OK HTTP response.
 */
export async function fetchThread(
  page: Page,
  thread: ThreadLink
): Promise<FetchThreadResult | null> {
  return page.evaluate(async (slug) => {
    /* eslint-disable no-undef */
    const response = await fetch(`https://www.perplexity.ai/rest/thread/${slug}`);
    if (!response.ok) return null;

    const raw = (await response.json()) as Record<string, unknown>;
    let threadData: Record<string, unknown> = raw;

    // Normalize paginated response: rename `entries` → `steps` for consistency
    if (raw['status'] && Array.isArray(raw['entries'])) {
      threadData = {
        ...raw,
        steps: raw['entries'],
      };
    }

    const stepCount =
      (Array.isArray((threadData as { steps?: unknown[] })['steps'])
        ? (threadData as { steps: unknown[] })['steps'].length
        : 0) ||
      (Array.isArray((raw as { steps?: unknown[] })['steps'])
        ? (raw as { steps: unknown[] })['steps'].length
        : 0);

    return { data: threadData as Record<string, unknown>, stepCount };
  }, thread.slug);
}
