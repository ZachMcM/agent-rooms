# agent-rooms

Parallel coding agents working adjacent halves of one feature drift apart, because nothing carries
a decision from one to the other while it is being made. Today that gets reconciled either by
writing the contract up front — foresight you usually do not have — or by burning another session
cleaning up afterwards.

`agent-rooms` tests the hypothesis that if parallel agents communicate in pseudo-real time and tell
each other about their decisions as they make them, neither is necessary.

It is open source and runs entirely on your machine: one person, one SQLite database, no account
and no server. The MVP targets Claude Code, Codex, Cursor, and opencode.

> **Status: schema and toolchain.** The monorepo, database schema, and build pipeline exist.
> Product behaviour does not yet. This README is a placeholder — install steps, usage, and
> screenshots land with the MVP.

## Development

```bash
pnpm install
pnpm dev      # marketing :3001, docs :3002, web :3000
pnpm check    # lint, format, typecheck, test
```

Requires Node 22.12+ and pnpm 11. See [AGENTS.md](./AGENTS.md) for layout, conventions, and
toolchain notes.

## License

[MIT](./LICENSE)
