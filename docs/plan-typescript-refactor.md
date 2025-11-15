# Plan: TypeScript Refactor for Perplexity Exporter

Modernize the Perplexity exporter from ad-hoc JavaScript scripts to a robust TypeScript application with proper architecture, error handling, testing, and developer experience. Transform the proof-of-concept into a maintainable, type-safe tool suitable for reliable data export operations.

## Steps

1. **Establish TypeScript foundation** — Create `tsconfig.json`, add TypeScript & tooling dependencies (`package.json`), configure build pipeline with `tsup` or `tsc`, add `.gitignore`, `.eslintrc.json`, `.prettierrc`, setup `.env` configuration pattern

2. **Define core type system** — Create `src/types/` with interfaces for `PerplexityThread`, `Collection`, `ApiResponse`, `ExportConfig`, `BrowserConfig`, `CookieData`; define discriminated unions for API response states; add Zod schemas for runtime validation

3. **Extract API client layer** — Refactor into `src/services/PerplexityApiClient.ts` class with methods `listThreads()`, `getThread()`, `listCollections()`, `getCollection()`; implement retry logic, rate limiting, response validation; move endpoint definitions from `browser-config.js` to typed constants

4. **Modularize browser automation** — Create `src/services/BrowserManager.ts` class extracting stealth configuration from `browser-config.js`; implement methods `initializeBrowser()`, `createContext()`, `setupStealth()`; make browser configuration adaptive to support both Chromium and Firefox with browser-specific stealth techniques and fingerprint handling; add `src/services/CookieManager.ts` for secure cookie handling from `extract-cookies.js` and `cookies.json`

5. **Build browser-based command system** — Create `src/commands/` directory with TypeScript modules for each operation (`ExportCommand.ts`, `SetupCommand.ts`, `CaptureCommand.ts`); each command launches browser automation internally; build thin CLI wrapper in `src/index.ts` using Commander.js to parse arguments and delegate to browser-based commands; implement progress indicators that work within browser context; add interactive prompts for user input during browser sessions

6. **Add error handling & testing** — Wrap all async operations with proper try-catch and typed errors; create `src/utils/errors.ts` with custom error classes; add Jest configuration, write unit tests for `PerplexityApiClient`, `BrowserManager`, utility functions; implement integration tests for end-to-end export workflow

## Further Considerations

1. **Environment configuration** — Should sensitive data (cookies, API version) live in `.env` file or remain in persistent browser profile? Recommend `.env` for version/URLs, keep browser profile for session cookies with encrypted vault option.

2. **Migration strategy** — Incremental (convert file-by-file, keep old scripts working) vs. clean slate (full rewrite in `src/`, deprecate old files)? Recommend clean slate with backward compatibility shim for existing exported data format.

3. **Monorepo structure** — Should we separate into `packages/core` (API client), `packages/cli` (commands), `packages/types` (shared types) for future extensibility, or keep simple single-package structure? Recommend single package initially, refactor to monorepo if new consumers emerge.
