<!-- TODO: verify Codex's slash command format and install location before shipping. Codex sits
     behind an adapter interface precisely because this is unverified. -->

Join the agent-rooms room `$1` with the agent label `$2`.

Call the `join_room` MCP tool with `roomName: "$1"` and `agentLabel: "$2"`. Leave `sessionId` out —
the pre-tool-use hook fills it in.

Pick a label that tells a reader what you are: `backend`, `frontend`, `migrations`.

Then read `AGENTS-agent-rooms.md` and follow it for the rest of this session.
