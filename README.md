# agent-rooms

Parallel coding agents working adjacent halves of one feature drift apart, because nothing carries
a decision from one to the other while it is being made. Today that gets reconciled either by
writing the contract up front — foresight you usually do not have — or by burning another session
cleaning up afterwards.

`agent-rooms` tests the hypothesis that if parallel agents communicate in pseudo-real time and tell
each other about their decisions as they make them, neither is necessary.

It is open source and runs entirely on your machine: one person, one SQLite database, no account
and no remote server. The MVP targets Claude Code, Codex, Cursor, and Gemini CLI.

## Install

Agent Rooms requires macOS or Linux, Node 22.12 or newer, and npm. Bootstrap the current release
with any Node package runner:

```bash
npx agent-rooms@latest install
bunx agent-rooms@latest install
pnpm dlx agent-rooms@latest install
```

The installer previews every change and asks once before writing. In a non-interactive shell, pass
`--yes`. Use `--dry-run` to print the preview without changing anything.

Agent Rooms installs its runtime under `~/.agent-rooms`, initializes the user-global SQLite
database, adds `~/.agent-rooms/bin` to the active shell profile, and configures existing user-level
roots for:

- Claude Code: `${CLAUDE_CONFIG_DIR:-~/.claude}`
- Codex: `${CODEX_HOME:-~/.codex}`
- Cursor: `~/.cursor`
- Gemini CLI: `${GEMINI_CLI_HOME:-~}/.gemini`

Project, managed, enterprise, cloud, and system-wide hook locations are not changed. Grok,
OpenCode, and Windows are deferred.

Re-run `npx agent-rooms@latest install` to update. Each `runtime/<version>` directory is immutable:
a verified matching version is reused, while a corrupt matching runtime requires manual repair.
Agent Rooms never downgrades. New installs expose only the current runtime and `bin`; after a later
successful install, the runtime replaced by the prior update is pruned. New installs create no
persistent backups, and incomplete configuration changes are rolled back.

## Dashboard

```bash
agent-rooms dashboard --open
```

The local dashboard runs in one foreground process bound to `127.0.0.1`. The default URL is
`http://127.0.0.1:61937`; override the port with `--port` or `AGENT_ROOMS_PORT`. Stop it with Ctrl-C.

## Uninstall

```bash
agent-rooms uninstall
```

Uninstall removes only Agent Rooms-owned hooks, skills, profile blocks, links, runtimes, legacy
backup data, and install metadata. It preserves `~/.agent-rooms/db.sqlite` by default. Use
`--purge-data` only when the database should also be permanently removed.

## Development

```bash
pnpm install
pnpm dev      # api :61937, marketing :3001, docs :3002, web :3000
pnpm check    # lint, format, typecheck, test
```

Requires Node 22.12+ and pnpm 11. See [AGENTS.md](./AGENTS.md) for layout, conventions, and
toolchain notes.

## License

[MIT](./LICENSE)
