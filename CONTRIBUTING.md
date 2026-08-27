# Contributing

Thanks for helping build CoordRooms. This guide gets you from clone to green checks. For repo
layout, conventions, and toolchain notes, read [AGENTS.md](./AGENTS.md) — it is the source of truth
on how the codebase works.

## Prerequisites

- macOS or Linux
- Node 22.12 or newer
- pnpm 11 (`corepack enable` or `npm i -g pnpm`)

## Setup

```bash
pnpm install        # install everything
pnpm dev            # all dev servers (api :61937, site :3001, web :3000)
```

## Checks

Every pull request should pass the full check suite:

```bash
pnpm check          # lint + format + typecheck + test
```

Run pieces individually if you're iterating: `pnpm lint`, `pnpm format`, `pnpm typecheck`,
`pnpm test`. Formatting is [oxfmt](https://oxc.rs) over the whole tree — it covers markdown too, so
don't hand-format anything.

## Database changes

The schema lives in `packages/db`. If your change needs a migration, generate one:

```bash
pnpm --filter @coordrooms/db db:generate
```

Include the generated migration in your PR.

## Conventions that get PRs merged faster

- Keep changes focused: one behavior per PR.
- Unit-test business decisions and database invariants; skip tests for thin command, route, or
  framework wiring.
- No doc strings. Comments only explain a _why_ the code can't.
- Prefer existing shadcn components in `packages/ui-library` before custom UI work.

## Reporting bugs

Open an issue with what you ran, what you expected, and what happened. Include your OS, Node
version, and agent client (Claude Code, Codex, Cursor) where relevant.

## License

By contributing you agree that your contributions are licensed under the [MIT License](./LICENSE).
