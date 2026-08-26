# coordrooms

Parallel coding agents working adjacent halves of one feature drift apart, because nothing carries
a decision from one to the other while it is being made. Today that gets reconciled either by
writing the contract up front — foresight you usually do not have — or by burning another session
cleaning up afterwards.

`coordrooms` tests the hypothesis that if parallel agents communicate in real time and tell
each other about their decisions as they make them, neither is necessary.

It is open source and runs entirely on your machine: one person, one SQLite database, no account
and no remote server. The MVP targets Claude Code, Codex, and Cursor.

## Install

CoordRooms requires macOS or Linux, Node 22.12 or newer, and npm. Bootstrap the current release
with any Node package runner:

```bash
npx coordrooms@latest install
bunx coordrooms@latest install
pnpm dlx coordrooms@latest install
```

The installer previews every change and asks once before writing. In a non-interactive shell, pass
`--yes`. Use `--dry-run` to print the preview without changing anything.

CoordRooms installs its runtime under `~/.coordrooms`, initializes the user-global SQLite
database, adds `~/.coordrooms/bin` to the active shell profile, and writes hooks to existing
user-level configuration roots for:

- Claude Code: `${CLAUDE_CONFIG_DIR:-~/.claude}`
- Codex: `${CODEX_HOME:-~/.codex}`
- Cursor: `~/.cursor`

Claude Code and Cursor skills follow their configuration roots. The Codex skill installs at
`$HOME/.agents/skills/coordrooms/SKILL.md`; `CODEX_HOME` affects Codex hooks only.

Project, managed, enterprise, cloud, and system-wide hook locations are not changed. Grok,
OpenCode, and Windows are deferred.

### Trust Codex hooks

After an install that adds or updates Codex hooks, review and trust the CoordRooms hooks before
they run. In the Codex CLI, run `/hooks`; in Codex Desktop, open Codex's hook review. CoordRooms
cannot pre-trust ordinary hooks: Codex requires review of the exact hook definition, and new or
changed definitions may need review again. See the [Codex hooks documentation](https://developers.openai.com/codex/hooks).

Re-run `npx coordrooms@latest install` to update. Each `runtime/<version>` directory is immutable:
a verified matching version is reused, while a corrupt matching runtime requires manual repair.
CoordRooms never downgrades. New installs expose only the current runtime and `bin`; after a later
successful install, the runtime replaced by the prior update is pruned. New installs create no
persistent backups, and incomplete configuration changes are rolled back.

## Dashboard

```bash
coordrooms dashboard --open
```

The local dashboard runs in one foreground process bound to `127.0.0.1`. The default URL is
`http://127.0.0.1:61937`; override the port with `--port` or `COORDROOMS_PORT`. Stop it with Ctrl-C.

## Uninstall

```bash
coordrooms uninstall
```

Uninstall removes only CoordRooms-owned hooks, skills, profile blocks, links, runtimes, legacy
backup data, and install metadata. It preserves `~/.coordrooms/db.sqlite` by default. Use
`--purge-data` only when the database should also be permanently removed.

## Development

```bash
pnpm install
pnpm dev      # api :61937, site :3001, web :3000
pnpm check    # lint, format, typecheck, test
```

Requires Node 22.12+ and pnpm 11. See [AGENTS.md](./AGENTS.md) for layout, conventions, and
toolchain notes.

## Contributing

Start by reading [AGENTS.md](./AGENTS.md), then install dependencies and run the checks locally:

```bash
pnpm install
pnpm check
```

Keep changes focused and add tests for business decisions or database invariants. If a schema
change requires a migration, generate it with:

```bash
pnpm --filter @coordrooms/db db:generate
```

Include the generated migration with your change and describe the behavior you changed in the
pull request.

## License

[MIT](./LICENSE)
