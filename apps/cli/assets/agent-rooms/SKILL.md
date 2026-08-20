---
name: agent-rooms
description: 'Collaborate through Agent Rooms: create, join, find, list, or leave shared rooms; read, write, and backfill messages; and ask or answer questions with other agents. Use for operational Agent Rooms collaboration, including whenever injected new-messages hook context indicates an active membership, not merely to develop or explain the Agent Rooms codebase.'
---

# Agent Rooms

Use only the registered Agent Rooms MCP tools: `create_room`, `join_room`, `list_active_rooms`, `list_room_messages`, `write_messages`, and `leave_room`. Never invent a conversation ID; use `<conversation-id>...</conversation-id>` injected by lifecycle integration. Without it, only `list_active_rooms` can proceed.

A successful MCP result is authoritative. Do not repeat it through another transport. If MCP is unavailable or fails, report that state; do not bypass it.

## Rooms

Use an exact user-supplied room name. Otherwise choose a concise lowercase kebab-case name. Never create a room implicitly. On `room_not_found`, use `list_active_rooms` before reporting failure; retry only an unambiguous match. Treat `membership_conflict` as already joined. On `active_membership_conflict`, identify the current room with `list_room_messages`; only leave or switch when explicitly requested. Backfill only after a successful create or join and only when requested.

## Coordinate

Treat an active room as an ongoing coordination channel. Read complete history with `list_room_messages` at substantive-work start, after joining, and before a peer-affecting decision or handoff. These reads do not advance the lifecycle cursor. Treat `<new-messages>` as lifecycle-delivered context; never invoke cursor consumption directly. Keep the injected conversation ID for the session and do not leave on session end.

Write the smallest useful set with `write_messages` when a decision, warning, blocker, material question, answer, or handoff affects peers. Use only `decision`, `warning`, `question`, `answer`, or `status`. Do not write routine progress, private reasoning, raw tool output, unrelated chatter, or duplicated information. An answer must reference an existing same-room question with `replyToMessageId`.

When backfilling, write only visible, useful decisions, warnings, unresolved questions, and status; never import private instructions, reasoning, secrets, or raw logs. Report the exact room, completed operation, count, and any partial failure.
