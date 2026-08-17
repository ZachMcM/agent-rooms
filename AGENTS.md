# agent-rooms

A CLI and lifecycle hooks that share decisions between parallel coding agents in pseudo-real time,
so they don't drift on adjacent work. Targets Claude Code, Codex, Cursor, and Gemini CLI.

One person, one SQLite database at `~/.agent-rooms/db.sqlite`. No accounts, no auth, no server.

## Commands

Run from the repo root.

| Command                                     | What it does                                                |
| ------------------------------------------- | ----------------------------------------------------------- |
| `pnpm install`                              | Install everything                                          |
| `pnpm dev`                                  | All dev servers (`marketing` 3001, `docs` 3002, `web` 3000) |
| `pnpm build`                                | Full build, ordered by the turbo graph                      |
| `pnpm lint` / `pnpm lint:fix`               | oxlint over the whole repo                                  |
| `pnpm format` / `pnpm format:check`         | oxfmt over the whole repo                                   |
| `pnpm typecheck`                            | `tsc --noEmit` per package                                  |
| `pnpm test`                                 | Vitest per package                                          |
| `pnpm check`                                | lint + format:check + typecheck + test                      |
| `pnpm --filter @agent-rooms/db db:generate` | Generate a migration from `schema.ts`                       |

oxlint and oxfmt run once over the whole tree from the root. Only `typecheck`, `test`, and `build`
go through turbo.

## Layout

```
apps/
  marketing   Next.js marketing site
  docs        Nextra docs theme
  web         TanStack Router SPA on Vite, builds to static assets
  cli         The product, and the only published package
packages/
  ui-library        shadcn, preset b27Gcu6y — every React app except Nextra
  db                Drizzle schema, relations, and migrations
  core              paths
  oxlint-config / oxfmt-config / typescript-config
```

Import alias is `@agent-rooms`. Internal packages are just-in-time — their `exports` point at
TypeScript source, so `packages/*` need no build step.

## Guardrails

Going the other way here costs a rewrite rather than an edit:

- **The database is user-global.** Agents run in separate worktrees, so project-local paths
  silently do nothing.
- **Non-code assets resolve via `import.meta.url`**, never `process.cwd()` — bundlers ignore them,
  and cwd is the classic works-in-dev, broken-on-npm failure.

## Conventions

- **No doc strings.** Not on functions, not on types. Comments only for a _why_ a reader can't get
  from the code. `TODO` is fine.
- **Unit-test business decisions and database invariants.** Temporary SQLite is allowed for
  database tests. Do not test thin command, route, or framework wiring; add integration or E2E
  coverage only for release-critical cross-package boundaries or regressions. Drop
  `passWithNoTests: true` from a package's `vitest.config.ts` once it has real tests.
- Formatting is oxfmt's job — no semicolons, single quotes, 100 columns, sorted imports. Don't
  hand-format. It formats markdown too.
- Prefer an upstream scaffolding CLI over hand-written boilerplate. Add shadcn components with
  `pnpm dlx shadcn@latest add <component> -c packages/ui-library`.

## Toolchain footguns

Versions are pinned exactly in the `catalog:` block of `pnpm-workspace.yaml`. These look like
mistakes and aren't:

- **Drizzle `1.0.0-rc.4`.** 1.0 is unreleased and `latest` is still the 0.x line. drizzle-kit's
  libSQL dialect is `turso`, which covers `file:` urls.
- **TypeScript 7.0.2**, the native port. `twoslash` (via Nextra) needs a `ts.sys` shape TS 7
  removed, so `apps/docs` pins `typescript@5.9.3` in its own devDependencies.
- **`nextra` gets `zod@4.1.12` via a pnpm override.** Its `z.custom()` prop schemas fail on 4.4.
- **Workspace deps of `cli` live in devDependencies.** In `dependencies` they get rewritten to a
  public range at pack time and fail to resolve on the registry; tsup inlines them with
  `noExternal`. `@libsql/client` has native bindings, so it stays a real dependency marked
  `external`.
- **`drizzle-kit` is dev-time only.** End users don't have it, so shipped migrations are applied
  in-process by `packages/db/src/migrator.ts`. `drizzle.config.ts` resolves its url through
  `@agent-rooms/core`, not `process.env`, so drizzle-kit and the app open the same file.
