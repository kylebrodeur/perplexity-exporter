import { z } from 'zod';

import { CollectionSchema, PerplexityThreadSchema } from './perplexity.js';

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  total: z.number().int().nonnegative().optional(),
  pageSize: z.number().int().positive().optional(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retriable: z.boolean().default(false),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

const successResponseSchema = <TSchema extends z.ZodTypeAny>(payloadSchema: TSchema) =>
  z.object({
    status: z.literal('success'),
    data: payloadSchema,
    receivedAt: z.string().datetime(),
    requestId: z.string().optional(),
    cached: z.boolean().optional(),
    pagination: PaginationSchema.optional(),
  });

const errorResponseSchema = z.object({
  status: z.literal('error'),
  error: ApiErrorSchema,
  receivedAt: z.string().datetime(),
  requestId: z.string().optional(),
});

// Helper keeps discriminated union creation consistent across API layers.
export const createApiResponseSchema = <TSchema extends z.ZodTypeAny>(payloadSchema: TSchema) =>
  z.discriminatedUnion('status', [successResponseSchema(payloadSchema), errorResponseSchema]);

export type ApiSuccessResponse<T> = {
  status: 'success';
  data: T;
  receivedAt: string;
  requestId?: string;
  cached?: boolean;
  pagination?: Pagination;
};

export type ApiErrorResponse = {
  status: 'error';
  error: ApiError;
  receivedAt: string;
  requestId?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ThreadListResponseSchema = createApiResponseSchema(
  z.object({ threads: z.array(PerplexityThreadSchema) })
);
export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;

export const ThreadDetailResponseSchema = createApiResponseSchema(PerplexityThreadSchema);
export type ThreadDetailResponse = z.infer<typeof ThreadDetailResponseSchema>;

export const CollectionListResponseSchema = createApiResponseSchema(
  z.object({ collections: z.array(CollectionSchema) })
);
export type CollectionListResponse = z.infer<typeof CollectionListResponseSchema>;
