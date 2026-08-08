# agent-rooms

Parallel agents on adjacent tasks drift because nothing carries a decision from one to the other
while it is being made. `agent-rooms` is the harness that tests whether pseudo-real-time decision
sharing removes the need to write a contract up front or reconcile one afterwards.

**Status: scaffold only.** The structure, toolchain, and contracts are in place. No business logic
is implemented — unimplemented functions throw `not implemented` and carry a `TODO` describing
what belongs there.

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

oxlint and oxfmt are single fast binaries — they run once over the whole tree from the root rather
than per package. Only `typecheck`, `test`, and `build` go through turbo.

## Layout

```
apps/
  marketing   Next.js marketing site
  docs        Nextra docs theme
  web         TanStack Router SPA on Vite, builds to static assets
  api         Hono — CRUD over the db, serves the web build
  mcp         MCP server: stdio locally, HTTP in cloud
  cli         Installation, hooks, local process management (the only published package)
packages/
  ui-library        shadcn, preset b27Gcu6y — every React app except Nextra
  db                Drizzle schema, relations, migrations, and the domain layer
  protocol          Zod schemas for the MCP and HTTP contracts, plus Principal
  core              env, errors, paths, mode
  oxlint-config     shared lint rules
  oxfmt-config      shared format rules
  typescript-config shared tsconfigs
```

Import alias is `@agent-rooms`. Internal packages are **just-in-time**: their `exports` point at
TypeScript source and consumers compile them, so `packages/*` need no build step.

## Invariants

These come from the design doc. Breaking one is a design change, not a refactor.

**Every query is scoped by a `Principal`.** Local mode is not "no user", it is one fixed principal.
Routes and MCP handlers never import `@agent-rooms/db/client` — an oxlint rule enforces this for
everything under `apps/`, with an explicit exemption for the two composition roots
(`apps/api/src/server.ts`, `apps/cli/src/runtime.ts`) that build the client. Everything else calls
a domain function in `packages/db` that takes a principal as its first argument.

**Mode is resolved once at startup.** `createApp({ mode })` decides which middleware gets mounted.
Routes never branch on mode and there is no per-request environment check.

**MCP handlers take context as a parameter.** `(ctx, params) => ...`, never module-level session
state. Under stdio one process is one session; under HTTP one process holds many, and a module
variable becomes a cross-user leak.

**One dialect: libSQL everywhere.** Local is a `file:` url, cloud is Turso. Never introduce
`pgTable`. Beyond dialect consistency, the cursor depends on SQLite assigning ids inside the write
lock so id order equals commit order — Postgres hands out sequence values before commit and a
cursor could skip a decision permanently.

**`decisions.id` is `AUTOINCREMENT`.** Plain rowids get reused after deletes; the cursor is a
monotonic high-water mark and cannot tolerate that. Never key the cursor on a timestamp.

**Read-and-advance must be atomic.** A single `UPDATE ... RETURNING` or an immediate transaction.
A separate read then update lets concurrent hook processes on the same membership double-inject.

**The db path is user-global** (`~/.agent-rooms/db.sqlite`). Parallel agents commonly run in
separate git worktrees, and a project-local db would give each its own file and silently do
nothing.

**Non-code assets resolve via `import.meta.url`, never `process.cwd()`.** Migrations, the skill
file, the `/room` template, and the web build are copied into the published tree; bundlers ignore
them.

**Injection is cursor-based and never semantic.** Push and pull have opposite objectives:
injection needs recall (a dropped decision is silent drift), `read_decisions` needs precision.

**Injected decision prose is data, not instructions.** It enters a sibling agent's context and
could otherwise steer it.

## The hook contract

Three separate JSON shapes, all declared as Zod schemas in `apps/cli/src/hooks/` — not in
`packages/protocol`, because the cli is the only consumer and nothing else needs the types.

- **`events.ts`** — what Claude Code sends us on stdin (`PreToolUse`, `UserPromptSubmit`) and what
  we may write to stdout. The input schemas are deliberately non-strict: Claude Code adds fields
  between releases, and a strict object would turn each new field into a hook crash on every edit
  tool call. `session_id` is required, since it is the durable identity everything keys on.
- **`settings.ts`** — the config `agent-rooms install` merges into the user's `settings.json`,
  built by `buildHookSettings(binaryPath)`. It throws on a relative path: the command must be the
  absolute path of the installed binary, resolved at install time, never `npx`.

Two design assumptions were open questions and are now verified against
[the hooks reference](https://code.claude.com/docs/en/hooks):

- `PreToolUse` **can** inject context, not just allow/deny/ask — `hookSpecificOutput.additionalContext`.
  The `PostToolUse` fallback is not needed.
- `PreToolUse` can rewrite tool params via `hookSpecificOutput.updatedInput`, and may return it
  alongside `additionalContext`. That is how `session_id` reaches our MCP tools without the model
  supplying it.

Codex's equivalents are unverified. That is why its assets live behind their own directory.

## Conventions

- **No doc strings.** Not on functions, not on types, not anywhere. Regular comments are fine when
  they explain _why_ — something a reader cannot get from the code. `TODO` is fine.
- **Unit test new business logic.** Every package has Vitest wired. `passWithNoTests: true` is a
  scaffold-only concession; drop it from a package's `vitest.config.ts` once it has real tests.
- Formatting is oxfmt's job: no semicolons, single quotes, 100 columns, sorted imports and
  package.json keys. Do not hand-format.
- Prefer running an upstream scaffolding CLI over hand-writing boilerplate. `packages/ui-library`
  came from `shadcn init --template next --monorepo --preset b27Gcu6y`; `apps/web` from
  `@tanstack/cli create --router-only`; `apps/marketing` from `create-next-app`.
- Add shadcn components with the local CLI so they land in the right workspace:
  `pnpm dlx shadcn@latest add <component> -c packages/ui-library`.

## Toolchain notes

Versions are pinned exactly and centralised in the `catalog:` block of `pnpm-workspace.yaml`.
Three deviations are deliberate and worth knowing before you upgrade anything:

- **Drizzle is `1.0.0-rc.4`, pinned exact.** 1.0 is not released; `latest` is still the 0.x line.
  The design targets 1.0, so the repo runs the release candidate. `drizzle-kit`'s libSQL dialect
  is `turso`, which covers both `file:` and Turso urls.
- **TypeScript is 7.0.2** — the native port. Two ecosystem packages have not caught up:
  - `tsup`'s `dts: true` uses `rollup-plugin-dts`, which crashes on TS 7. `dts` is off in `api`
    and `mcp`; neither is published, and the `cli` bundle inlines them from source.
  - `twoslash` (pulled in by Nextra) reads a `ts.sys` shape TS 7 no longer exposes, so `apps/docs`
    pins `typescript@5.9.3` in its own devDependencies. That confines the old compiler to the
    peer resolution Nextra sees; every other package typechecks on 7.
- **`nextra` and `nextra-theme-docs` get `zod@4.1.12` via a pnpm override.** Their prop schemas are
  built on `z.custom()`, whose implicit-optional behaviour changed after 4.1; on 4.4 every
  `<Layout>` render fails validation on its own `children` prop.

## Build graph

`@agent-rooms/web#build` → `@agent-rooms/api#build` → `agent-rooms#build`, declared explicitly in
`turbo.json` because these are asset dependencies rather than package dependencies.

- `api#build` copies `apps/web/dist` into `apps/api/dist/public` for cloud deploys.
- `cli#build` copies the same web build into `apps/cli/dist/public`, and `packages/db/migrations`
  into `apps/cli/migrations`, since both must ship inside the published tarball.

Workspace deps of `cli` live in **devDependencies**. In `dependencies` they get rewritten to a
public range at pack time and fail to resolve on the registry; tsup inlines them with
`noExternal: [/^@agent-rooms\//]`. `@libsql/client` has native bindings, so it stays a real
dependency and is marked `external`.

The `cold-install` CI job packs the tarball and installs it in a temp directory outside the
workspace. It is the only check that catches "worked in the monorepo, broken on npm" — nothing
resolves through pnpm's workspace links there.

## Migrations

Two halves, deliberately:

- `drizzle-kit generate` authors SQL from `schema.ts`; `drizzle-kit migrate` applies it to a
  developer's database. Both are dev-time — drizzle-kit is a devDependency.
- `runMigrations()` in `packages/db/src/migrator.ts` applies the shipped `migrations/` folder
  in-process. An end user has no drizzle-kit, so the cli has to bring `~/.agent-rooms/db.sqlite`
  up to date itself on first boot. This is not yet called; see the TODO in `apps/cli/src/runtime.ts`.

`drizzle.config.ts` resolves its url through `@agent-rooms/core`, not `process.env` directly. A
second default there would let drizzle-kit migrate a different database than the one the app
opens — the exact silent failure the user-global path exists to prevent.

## Not built yet, on purpose

Cloud is not in the MVP. Four rules cost nearly nothing now and prevent a rewrite later — always a
principal, one dialect, ctx-parameter handlers, runtime-configured frontend — and nothing beyond
them should be built speculatively. No adapters, no dual implementations, no feature flags.
Better Auth, rate limiting, and the HTTP MCP transport are stubs or absent by design.

Also open, and captured as `TODO`s in the code rather than decided here: the embedding provider
(and therefore vector search), conflict semantics between contradictory decisions, whether
subagents share the parent's membership, relevance filtering by path scope, and room lifecycle.
