# agent-rooms

Parallel coding agents working adjacent halves of one feature drift apart, because nothing carries
a decision from one to the other while it is being made. Today that gets reconciled either by
writing the contract up front — foresight you usually do not have — or by burning another session
cleaning up afterwards.

`agent-rooms` tests the hypothesis that if parallel agents communicate in pseudo-real time and tell
each other about their decisions as they make them, neither is necessary.

It is open source and self-hosted first. The MVP is local-only and targets Claude Code and Codex.

> **Status: scaffold.** The monorepo, toolchain, and contracts exist. Business logic does not yet.

## How it works

- A **stdio MCP server** exposes `join_room`, `write_decision`, and `read_decisions`. Agents author
  their own decisions — the reasoning, not the diff.
- **Command hooks** push new decisions into a sibling's context: `UserPromptSubmit` drains
  everything new at the start of a turn, and `PreToolUse` on edit tools catches decisions that
  landed mid-turn.
- A **local web UI** shows what each room has accumulated.
- A **libSQL database** at `~/.agent-rooms/db.sqlite` holds it — user-global, so agents in separate
  worktrees share one room.

## Development

```bash
pnpm install
pnpm dev      # marketing :3001, docs :3002, web :3000
pnpm check    # lint, format, typecheck, test
```

Requires Node 22.12+ and pnpm 11. See [AGENTS.md](./AGENTS.md) for layout, invariants, and
toolchain notes.

## License

[MIT](./LICENSE)
