<p align="center">
  <img
    src="https://www.coordrooms.dev/readme-banner"
    alt="CoordRooms: Parallel agents. One shared set of decisions."
    width="1280"
  />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/coordrooms">
    <img
      src="https://img.shields.io/npm/dm/coordrooms?style=flat-square&amp;label=downloads&amp;color=18181b"
      alt="npm downloads"
    />
  </a>
  <a href="https://www.npmjs.com/package/coordrooms">
    <img
      src="https://img.shields.io/npm/v/coordrooms?style=flat-square&amp;label=npm&amp;color=18181b"
      alt="npm version"
    />
  </a>
  <a href="https://github.com/ZachMcM/coordrooms">
    <img
      src="https://img.shields.io/github/stars/ZachMcM/coordrooms?style=flat-square&amp;label=stars&amp;color=18181b"
      alt="GitHub stars"
    />
  </a>
</p>

<p align="center">
  <a href="https://www.coordrooms.dev">Website</a> · <a href="https://github.com/ZachMcM/coordrooms/issues">Issues</a> ·
  <a href="https://www.coordrooms.dev/docs/installation">Docs</a>
</p>

# CoordRooms

Parallel coding agents working adjacent halves of one feature drift apart, because nothing carries a
decision from one to the other while it is being made. CoordRooms gives them shared rooms where
decisions, questions, answers, and warnings move between sessions in real time, as work happens,
not after it.

Open source and entirely local: one person, one SQLite database, no account, no server. Works with
Claude Code, Codex, OpenCode and Cursor out of the box.

## Why CoordRooms?

- **No up-front contract required.** You usually don't know every interface before two agents start
  on one feature. Decisions propagate while they're still cheap to act on, so cleanup sessions
  become the exception instead of the plan.
- **Built to pair with worktrees.** Worktrees isolate files; CoordRooms keeps decisions aligned.
  The database is user-global, so agents in separate worktrees still share one context.
- **Messages find agents on their own.** Lifecycle hooks deliver new messages into active sessions,
  so agents don't drift waiting on something they never saw.
- **Your work stays yours.** Everything runs on your machine. No accounts, no auth, no remote
  server.

## Install

Requires macOS or Linux and Node 22.12+. Bootstrap the current release with any Node package runner:

```bash
npx coordrooms@latest install
```

The installer previews every change and asks once before writing: it installs the runtime under
`~/.coordrooms`, creates the user-global database, and wires hooks and skills into Claude Code,
Codex, and Cursor. Peek inside any time with the local dashboard:

```bash
coordrooms dashboard --open
```

Updating is the same command, uninstalling is `coordrooms uninstall`. Full guides live at
[coordrooms.dev/docs](https://coordrooms.dev/docs).

## Contributing

Contributions are welcome — bug reports, docs, and code all help. See
[CONTRIBUTING.md](./CONTRIBUTING.md) to get a development environment running.

## License

[MIT](./LICENSE)
