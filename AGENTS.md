# agent-rooms

Parallel agents on adjacent tasks drift because nothing carries a decision from one to the other
while it is being made. `agent-rooms` shares those decisions in pseudo-real time: a CLI the agent
calls, lifecycle hooks that inject decisions into sibling agents, and a skill that drives both. It
targets Claude Code, Codex, Cursor, and opencode, and stores everything in a local SQLite database.

The product surface, the injection mechanism, and the reasoning behind both live in the
[design doc](https://app.notion.com/p/agent-comms-design-doc-3b529fed6d7d800984eef21071e6dd08).
Read it before changing behaviour. It is a design doc, not a spec — if the code wants to go
somewhere else during the MVP, say so and go there.

**Status: scaffold.** Most business logic is unimplemented and throws `not implemented` with a
`TODO`. The agent assets under `apps/cli/assets/` still describe the removed MCP tools; they get
rewritten when the CLI commands they should describe actually exist.

## Commands

Run from the repo root.

| Command                                        | What it does                                                |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `pnpm install`                                 | Install everything                                          |
| `pnpm dev`                                     | All dev servers (`marketing` 3001, `docs` 3002, `web` 3000) |
| `pnpm build`                                   | Full build, ordered by the turbo graph                      |
| `pnpm lint` / `pnpm lint:fix`                  | oxlint over the whole repo                                  |
| `pnpm format` / `pnpm format:check`            | oxfmt over the whole repo                                   |
| `pnpm typecheck`                               | `tsc --noEmit` per package                                  |
| `pnpm test`                                    | Vitest per package                                          |
| `pnpm check`                                   | lint + format:check + typecheck + test                      |
| `pnpm --filter @agent-rooms/db db:generate`    | Generate a migration from `schema.ts`                       |
| `pnpm --filter @agent-rooms/api auth:generate` | Regenerate Better Auth's tables to diff against `schema.ts` |

oxlint and oxfmt run once over the whole tree from the root. Only `typecheck`, `test`, and `build`
go through turbo.

## Layout

```
apps/
  marketing   Next.js marketing site
  docs        Nextra docs theme
  web         TanStack Router SPA on Vite, builds to static assets
  api         Hono — CRUD over the db, serves the web build
  cli         The product: commands, hooks, install. The only published package
packages/
  ui-library        shadcn, preset b27Gcu6y — every React app except Nextra
  db                Drizzle schema, relations, migrations, and the domain layer
  protocol          Zod schemas for the CLI and HTTP contracts, plus Principal
  core              env, errors, paths, mode
  oxlint-config / oxfmt-config / typescript-config
```

Import alias is `@agent-rooms`. Internal packages are just-in-time — their `exports` point at
TypeScript source, so `packages/*` need no build step.

## Guardrails

Not rules to litigate, but places where going the other way costs a rewrite rather than an edit:

- **Business logic lives in `packages/db`**, as functions taking a principal first. Apps call those
  rather than the db client directly — an oxlint rule enforces it, with the composition roots
  exempted. Local mode is one fixed principal, not "no user", so the scoped path is exercised
  constantly instead of first running in cloud.
- **libSQL/SQLite everywhere**, local and cloud. Introducing `pgTable` forks the schema and the
  migration set, and breaks a write-ordering property the design leans on.
- **The database is user-global** (`~/.agent-rooms/db.sqlite`). Parallel agents run in separate
  worktrees, so anything project-local silently does nothing.
- **Non-code assets resolve via `import.meta.url`**, never `process.cwd()`. Migrations, the skill,
  and the web build are copied into the published tree, and bundlers ignore them — this is the
  classic works-in-dev, broken-on-npm failure.
- **`cli` is the only package that ships.** If something needs to run on a user's machine, it is a
  cli command.

## Conventions

- **No doc strings.** Not on functions, not on types. Regular comments only when they explain a
  _why_ a reader cannot get from the code. `TODO` is fine.
- **Unit test new business logic.** `passWithNoTests: true` is a scaffold-only concession; drop it
  from a package's `vitest.config.ts` once it has real tests.
- Formatting is oxfmt's job — no semicolons, single quotes, 100 columns, sorted imports. Don't
  hand-format. It formats markdown too.
- Prefer running an upstream scaffolding CLI over hand-writing boilerplate. Add shadcn components
  with `pnpm dlx shadcn@latest add <component> -c packages/ui-library`.

## Toolchain footguns

Versions are pinned exactly in the `catalog:` block of `pnpm-workspace.yaml`. Three deviations are
deliberate and will look like mistakes:

- **Drizzle `1.0.0-rc.4`.** 1.0 is unreleased and `latest` is still the 0.x line. drizzle-kit's
  libSQL dialect is `turso`, which covers both `file:` and Turso urls.
- **TypeScript 7.0.2**, the native port. `tsup`'s `dts: true` crashes on it, so `dts` is off in
  `api`. `twoslash` (via Nextra) needs a `ts.sys` shape TS 7 removed, so `apps/docs` pins
  `typescript@5.9.3` in its own devDependencies.
- **`nextra` gets `zod@4.1.12` via a pnpm override.** Its `z.custom()` prop schemas fail on 4.4.

Better Auth's drizzle adapter declares a peer of `drizzle-orm@^0.45` against our `1.0.0-rc.4`. It
works, and `apps/api/src/app.test.ts` proves it end to end. Keep that test if you touch either
version.

Workspace deps of `cli` live in **devDependencies**. In `dependencies` they get rewritten to a
public range at pack time and fail to resolve on the registry; tsup inlines them with `noExternal`.
`@libsql/client` has native bindings, so it stays a real dependency marked `external`.

`drizzle-kit` is dev-time only — an end user has no drizzle-kit, so the shipped migrations are
applied in-process by `packages/db/src/migrator.ts`. `drizzle.config.ts` resolves its url through
`@agent-rooms/core` rather than `process.env`, so drizzle-kit and the app always open the same file.
