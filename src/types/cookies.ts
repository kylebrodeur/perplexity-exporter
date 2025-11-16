import { z } from 'zod';

const SAME_SITE_OPTIONS = ['Strict', 'Lax', 'None'] as const;
const COOKIE_SOURCE = ['browser', 'manual', 'env'] as const;

export const SameSiteSchema = z.enum(SAME_SITE_OPTIONS);
export type SameSite = z.infer<typeof SameSiteSchema>;

export const CookieSourceSchema = z.enum(COOKIE_SOURCE);
export type CookieSource = z.infer<typeof CookieSourceSchema>;

export const CookieDataSchema = z
  .object({
    name: z.string(),
    value: z.string(),
    domain: z.string(),
    path: z.string().default('/'),
    expires: z.number().optional(), // Accept float or int
    secure: z.boolean().default(true),
    httpOnly: z.boolean().default(false),
    session: z.boolean().default(false),
    sameSite: SameSiteSchema.optional(),
    source: CookieSourceSchema.default('browser').optional(),
    lastUpdated: z.string().datetime().optional(),
  })
  .passthrough(); // Allow extra fields from existing cookie files
export type CookieData = z.infer<typeof CookieDataSchema>;

export const CookieJarSchema = z.array(CookieDataSchema);
export type CookieJar = z.infer<typeof CookieJarSchema>;
