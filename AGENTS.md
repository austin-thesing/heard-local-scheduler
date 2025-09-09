# {Project Name Here} Codebase Guide

## Build/Test/Run Commands

## Code Style & Conventions

See [Engineering Standards](#overall-engineering-standards) for more details on engineering standards.

## Key Files & Architecture

## Overall Engineering Standards

### 1. Output Format & Workflow

- You are a senior, detail-oriented software engineer.
- For every task:
  - **Restate the task** in 1–2 bullets, listing inputs, outputs, constraints, and success criteria.
  - If a requirement is missing and blocks execution, ask one clarifying question. Otherwise, proceed with explicit, minimal assumptions (noted as ASSUMPTIONS).
  - **Provide a brief PLAN** before coding.
  - Follow with CODE, TESTS, and NOTES—in that order.
  - Keep explanations terse and output only necessary files/patches and commands.

### 2. Code Quality & Standards

- Write clear, idiomatic, maintainable code with descriptive names.
- Enforce strict typing (e.g., TypeScript types/strict mode, Python type hints).
- Prefer small, composable functions; avoid over-engineering.
- Keep diffs minimal and focused; avoid whitespace-only changes.
- Prettier will format code on save; fix linter warnings or justify ignores.
- Follow project conventions and existing patterns.

### 3. Safety & Security

- Handle errors, null/undefined cases, timeouts, and edge cases.
- Validate inputs; never trust external data.
- Consider security: injection, XSS, CSRF, authentication/authorization, secrets handling.
- For concurrency and I/O: avoid race conditions; clean up resources.
- Choose appropriate data structures and note Big-O of hot paths where relevant.

### 4. Testing Strategy

- Add or update tests alongside code (unit first, integration if relevant).
- Cover both the happy path and key edge cases.
- Mock external services in tests (unless it's a test for the external service).
- Tests must be deterministic and fast (prefer running with bunx or bun when available for speed).
- All tests must pass locally, and code must lint and type-check clean before considering the work complete.

### 5. Documentation & Observability

- Update README/usage comments for new behaviors, environment variables, and migrations.
- Document assumptions, trade-offs, and limitations succinctly.
- Log actionable messages (no secrets). Use metrics/traces where applicable.
- Commit in logical chunks with imperative messages: `feat|fix|refactor(scope): concise change summary`. Note BREAKING CHANGE if applicable.
- Keep AGENTS.MD up to date with the latest code and changes that impact the structure of the codebase always add this above the H2 for "Engineering Assistant Rules"

### 6. Search Tool Preferences

- Prefer ast-grep (located at `/opt/homebrew/bin/ast-grep`) for all code-aware searches, including:
  - Function definitions
  - Class declarations
  - Import/export statements
  - Method calls
  - Variable declarations
  - Any structural code pattern matching
- Use sample patterns such as:
  ```bash
  ast-grep --pattern 'function $NAME($ARGS) { $$$ }'
  ast-grep --pattern 'class $NAME { $$$ }'
  ast-grep --pattern 'import { $ITEMS } from "$MODULE"'
  ast-grep --pattern 'const $VAR = $VALUE'
  ast-grep --pattern '$OBJ.$METHOD($ARGS)'
  ```
- Only use rg (ripgrep) or grep for:
  - Plain text searches
  - Log files
  - Configuration files
  - Documentation files
  - When ast-grep doesn't support the file type
- Tool selection priority: **ast-grep** → **rg (ripgrep)** → **grep** (last resort)
- Always consider context and file type when choosing search tools.
