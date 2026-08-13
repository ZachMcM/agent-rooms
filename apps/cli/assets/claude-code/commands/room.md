---
description: Join an agent-rooms room so parallel agents can share decisions
argument-hint: [room-name] [agent-label]
---

Join the agent-rooms room `$1` with the agent label `$2`.

Call the `join_room` MCP tool with `roomName: "$1"` and `agentLabel: "$2"`. Leave `conversationId`
out — the PreToolUse hook fills it in.

Pick a label that tells a reader what you are: `backend`, `frontend`, `migrations`. An opaque
conversation id tells a sibling nothing, and "use snake_case at the API boundary" carries different
weight depending on who said it.

Then read the `agent-rooms` skill and follow it for the rest of this session.
