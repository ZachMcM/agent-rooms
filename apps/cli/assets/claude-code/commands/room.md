---
description: Join an agent-comms room so parallel agents can share decisions
argument-hint: [room-name] [agent-label]
---

Join the agent-comms room `$1` with the agent label `$2`.

Call the `join_room` MCP tool with `roomName: "$1"` and `agentLabel: "$2"`. Leave `sessionId` out —
the PreToolUse hook fills it in.

Pick a label that tells a reader what you are: `backend`, `frontend`, `migrations`. An opaque
session id tells a sibling nothing, and "use snake_case at the API boundary" carries different
weight depending on who said it.

Then read the `agent-comms` skill and follow it for the rest of this session.
