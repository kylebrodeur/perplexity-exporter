import { z } from 'zod';

export const LogLevelSchema = z.enum(['silent', 'error', 'warn', 'info', 'debug']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const BrowserTypeSchema = z.enum(['chromium', 'firefox', 'webkit']);
export type BrowserType = z.infer<typeof BrowserTypeSchema>;

export const RetryStrategySchema = z.object({
  attempts: z.number().int().min(1).default(3),
  delayMs: z.number().int().min(0).default(1000),
  backoffFactor: z.number().min(1).default(2),
  jitterMs: z.number().int().min(0).default(250),
});
export type RetryStrategy = z.infer<typeof RetryStrategySchema>;

export const ExportConfigSchema = z.object({
  outputDir: z.string().min(1),
  includeThreads: z.boolean().default(true),
  includeCollections: z.boolean().default(true),
  includeCitations: z.boolean().default(true),
  respectRateLimits: z.boolean().default(true),
  concurrency: z.number().int().min(1).max(5).default(2),
  waitForNetworkIdleMs: z.number().int().min(0).default(1000),
  maxThreads: z.number().int().positive().optional(),
  dryRun: z.boolean().default(false),
  logLevel: LogLevelSchema.default('info'),
  perplexityBaseUrl: z.string().url().default('https://www.perplexity.ai'),
  retry: RetryStrategySchema.default({
    attempts: 3,
    delayMs: 1000,
    backoffFactor: 2,
    jitterMs: 250,
  }),
});
export type ExportConfig = z.infer<typeof ExportConfigSchema>;

export const BrowserConfigSchema = z.object({
  browserType: BrowserTypeSchema.default('chromium'),
  headless: z.boolean().default(true),
  executablePath: z.string().optional(),
  profilePath: z.string().optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .default({ width: 1280, height: 720 }),
  timezoneId: z.string().optional(),
  userAgent: z.string().optional(),
  locale: z.string().default('en-US'),
  timeoutMs: z.number().int().min(1000).default(30000),
  stealth: z.boolean().default(true),
  allowDownloads: z.boolean().default(false),
  downloadPath: z.string().optional(),
});
export type BrowserConfig = z.infer<typeof BrowserConfigSchema>;
