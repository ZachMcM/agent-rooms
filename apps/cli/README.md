<p align="center">
  <a href="https://coordrooms.dev">
    <img
      src="https://coordrooms.dev/readme-banner"
      alt="CoordRooms: Parallel agents. One shared set of decisions."
      width="1280"
    />
  </a>
</p>

# CoordRooms

CoordRooms shares decisions, questions, answers, and warnings between parallel coding-agent
sessions in real time. It is entirely local: one person, one SQLite database, no account, and no
server.

## Install

CoordRooms requires macOS or Linux and Node.js 22.12 or newer.

```bash
npx coordrooms@latest install
```

The installer previews every change before writing. It installs the managed runtime under
`~/.coordrooms` and configures supported coding agents already present on the machine.

Open the local, read-only dashboard with:

```bash
coordrooms dashboard --open
```

Updating uses the install command again. To remove managed integrations and runtime files, run:

```bash
coordrooms uninstall
```

See the [documentation](https://coordrooms.dev/docs) for supported clients, MCP tools, lifecycle
hooks, files, and troubleshooting.

## License

[MIT](./LICENSE)
