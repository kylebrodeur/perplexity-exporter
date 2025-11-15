# TypeScript Setup

This document describes the TypeScript foundation established in Phase 1 of the refactor.

## Configuration Files

### tsconfig.json

- **Target**: ES2022 with Node.js support
- **Module System**: ESNext (ESM)
- **Strict Mode**: Enabled with comprehensive type checking
- **Output**: Compiled to `dist/` directory with source maps and declaration files

### tsup.config.ts

- **Build Tool**: tsup for fast, zero-config TypeScript bundling
- **Entry Point**: `src/cli.ts`
- **Output Format**: ESM (ES Modules)
- **Features**: Source maps, type declarations, tree-shaking

### ESLint (eslint.config.js)

- **Parser**: @typescript-eslint/parser
- **Plugins**: TypeScript ESLint, Prettier
- **Rules**: Recommended TypeScript rules + Prettier integration
- **Configuration**: Flat config format (ESLint 9+)

### Prettier (.prettierrc)

- **Line Width**: 100 characters
- **Style**: Single quotes, semicolons, 2-space tabs
- **Consistent**: Enforced across all TypeScript files

## Environment Configuration

### .env.example

Template for environment variables:

- Perplexity API settings (version, base URL)
- Export configuration (output directory, rate limiting)
- Browser settings (type, headless mode, profile directory)
- Debug settings

Copy `.env.example` to `.env` and customize for your environment.

## Build Scripts

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm run build`        | Build TypeScript to JavaScript (dist/)        |
| `npm run dev`          | Build with watch mode for development         |
| `npm run type-check`   | Run TypeScript type checking without emitting |
| `npm run lint`         | Run ESLint on TypeScript files                |
| `npm run lint:fix`     | Auto-fix ESLint issues                        |
| `npm run format`       | Format code with Prettier                     |
| `npm run format:check` | Check code formatting                         |

## Development Workflow

1. **Write TypeScript**: Add `.ts` files in `src/` directory
2. **Type Check**: Run `npm run type-check` frequently
3. **Lint**: Run `npm run lint` to catch issues
4. **Format**: Run `npm run format` to ensure consistent style
5. **Build**: Run `npm run build` to compile to `dist/`

## Project Structure

```
perplexity-exporter/
├── src/                    # TypeScript source files
│   └── cli.ts             # Main CLI entry point
├── dist/                   # Compiled JavaScript output
│   ├── cli.js
│   ├── cli.js.map
│   └── cli.d.ts
├── tsconfig.json          # TypeScript configuration
├── tsup.config.ts         # Build configuration
├── eslint.config.js       # ESLint configuration
├── .prettierrc            # Prettier configuration
├── .env.example           # Environment variable template
└── package.json           # Project dependencies & scripts
```

## Next Steps

Phase 2 and beyond will build on this foundation:

- **Phase 2**: Core type system with interfaces and Zod schemas
- **Phase 3**: API client layer with retry logic
- **Phase 4**: Browser automation refactor
- **Phase 5**: Full CLI implementation with Commander.js
- **Phase 6**: Testing infrastructure with Jest
