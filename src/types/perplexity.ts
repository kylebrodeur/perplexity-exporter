import { z } from 'zod';

const THREAD_VISIBILITY = ['private', 'unlisted', 'public'] as const;
const MESSAGE_ORIGIN = ['web', 'mobile', 'api'] as const;
const STEP_TYPE = ['INITIAL_QUERY', 'FINAL', 'SEARCH', 'REWRITE'] as const;
const ATTACHMENT_KIND = ['image', 'file', 'link', 'raw', 'unknown'] as const;

export const ThreadVisibilitySchema = z.enum(THREAD_VISIBILITY);
export type ThreadVisibility = z.infer<typeof ThreadVisibilitySchema>;

export const MessageOriginSchema = z.enum(MESSAGE_ORIGIN);
export type MessageOrigin = z.infer<typeof MessageOriginSchema>;

export const StepTypeSchema = z.enum(STEP_TYPE);
export type StepType = z.infer<typeof StepTypeSchema>;

export const CitationSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  sourceDomain: z.string().optional(),
  score: z.number().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const MessageAttachmentSchema = z.object({
  id: z.string(),
  kind: z.enum(ATTACHMENT_KIND).default('unknown'),
  url: z.string().url().optional(),
  title: z.string().optional(),
  addedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

export const ThreadStepSchema = z.object({
  step_type: StepTypeSchema,
  query_str: z.string().optional(),
  final_response: z.string().optional(),
  search_results: z.array(CitationSchema).optional(),
  attachments: z.array(MessageAttachmentSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ThreadStep = z.infer<typeof ThreadStepSchema>;

export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  visibility: ThreadVisibilitySchema.default('private'),
  threadCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  coverImageUrl: z.string().url().optional(),
  ownerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const PerplexityThreadSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  slug: z.string().optional(),
  summary: z.string().optional(),
  visibility: ThreadVisibilitySchema.default('private'),
  origin: MessageOriginSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  stepCount: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  collectionIds: z.array(z.string()).optional(),
  steps: z.array(ThreadStepSchema),
  metadata: z.record(z.unknown()).optional(),
});
export type PerplexityThread = z.infer<typeof PerplexityThreadSchema>;
