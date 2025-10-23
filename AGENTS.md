# Agent Guidelines - Heard Local Scheduler

## Build & Development Commands
- **Build**: `bun run build` (minifies JS/CSS to dist/)
- **Install deps**: `bun install`
- **Format**: `bunx prettier --write .` (single quotes, 2 spaces, trailing commas)
- **Test**: `bun test` (run single test: `bun test filename.test.js`)

## Code Style & Conventions
- **Language**: Vanilla JavaScript (ES6+), ES6 modules, no TypeScript
- **Format**: Prettier enforced: single quotes, semicolons, 2-space indent, 80 char lines
- **Functions**: Descriptive names, small/composable, strict typing mindset
- **Constants**: UPPER_SNAKE_CASE for configs
- **Error handling**: Wrap storage/DOM ops in try-catch, validate inputs
- **Pattern**: IIFE wrapper for isolation when needed

## Cursor Rules
Follow .cursor/rules/ workflow: PLAN→CODE→TESTS→NOTES, focused diffs, idiomatic style