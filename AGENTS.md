# Agent Guidelines - Heard Local Scheduler

## Build & Development Commands
- **Build**: `bun run build` (minifies JS/CSS to dist/)
- **Install deps**: `bun install`
- **Format**: `bunx prettier --write .` (Prettier configured: single quotes, 2 spaces, trailing commas)
- **Test**: No test suite configured yet; use `bun test` when tests are added

## Code Style & Conventions
- **Language**: Vanilla JavaScript (ES6+), no TypeScript
- **Format**: Prettier rules apply (.prettierrc): single quotes, semicolons, 2-space indent, 80 char lines
- **Functions**: Use descriptive names (e.g., `getStoredFormData`, `injectScheduler`)
- **Constants**: UPPER_SNAKE_CASE for configs (e.g., `SCHEDULER_CONFIG`, `DEBUG`)
- **Error handling**: Wrap storage/DOM operations in try-catch blocks
- **Logging**: Use conditional `log()` function with DEBUG flag
- **IIFE pattern**: Wrap scripts in `(function() { "use strict"; ... })()` for isolation

## Cursor Rules
Follow .cursor/rules/ guidelines:
- PLAN→CODE→TESTS→NOTES workflow, validate inputs, handle errors gracefully
- Small composable functions, focused diffs, keep docs current
- Use ast-grep for code searches when available