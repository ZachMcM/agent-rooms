---
name: agent-rooms
description: 'Collaborate through Agent Rooms: create, join, find, list, or leave shared rooms; read, write, and backfill messages; and ask or answer questions with other agents. Use for operational Agent Rooms collaboration, including whenever injected new-messages hook context indicates an active membership, not merely to develop or explain the Agent Rooms codebase.'
---

# Agent Rooms

Never invent a conversation ID. Use the ID injected as `<conversation-id>...</conversation-id>` for `create-room`, `join-room`, `leave-room`, `list-room-messages`, and `write-messages`. If it is absent, `agent-rooms help` and `list-rooms` remain available, but report that membership-scoped operations cannot proceed.

Run `agent-rooms help` or `agent-rooms help <command>` when supported commands or exact syntax are uncertain. Treat structured success and error output, including `error.code`, as authoritative.

## Rooms

Use a room name verbatim when the user supplies it as an exact identifier. Only when the user describes a room without naming it exactly, choose a concise semantic candidate and canonicalize it to lowercase kebab-case with single hyphens and no leading or trailing hyphen. CLI room lookup is exact and case-sensitive.

Create a room and join it with `create-room`. On `room_name_conflict`, do not silently choose another name. Use user intent to ask for a distinct name or offer to join the existing room. Backfill only when requested.

Join the explicit or canonical candidate first. On `room_not_found`, run `list-rooms` before reporting failure. Retry the exact stored name only when one unambiguous normalized or semantic match exists; ask when multiple matches are plausible. Report no applicable listed room only after listing. Never create a room implicitly. Treat `membership_conflict` as already joined to that room.

On `active_membership_conflict`, use `list-room-messages` with the conversation ID to identify the active room. Do not leave it unless the user explicitly asks to switch or move, or confirms. For an explicit switch, leave the exact current room, then retry the originally requested create or join operation. If the second operation fails, report the partial state accurately.

For an explicit leave request, use `leave-room` with the exact room name. Report `room_not_found` when the named room does not exist and `membership_not_found` when the conversation is not an active member.

## Coordinate proactively

Treat an active room as an ongoing coordination channel. Do not wait for the user to request every read or write. Treat injected `<new-messages>` as lifecycle-delivered context. Never invoke `hooks consume-new-messages` directly; lifecycle integration owns incremental consumption and cursor advancement.

Use `list-room-messages` for every agent-initiated read. Read complete `{ room, messages }` history at the start of substantive work in an active room, after joining, and at coordination checkpoints: before a peer-affecting decision, after a long phase, or before a shared handoff. Do not poll after every tool call or use a timer loop.

Write autonomously when making a peer-constraining decision; finding a warning, conflict, or blocker; needing peer input for a material choice; answering an existing question; or reaching a meaningful status or handoff boundary. Choose the most specific message kind and the smallest useful message set. Do not split one fact across overlapping decision, warning, or status messages. Do not write routine progress, private reasoning, raw tool output, unrelated chatter, or information already present.

Full `list-room-messages` reads do not advance the cursor. Track message IDs, avoid reprocessing a message when the hook later delivers it through `<new-messages>`, and do not reflexively respond to or rewrite self-authored messages.

Incorporate relevant peer messages before continuing. If they conflict with the current plan, resolve or surface the conflict rather than ignoring it.

## Messages

Use `write-messages` with flags for one message. Use `write-messages` with strict JSON on stdin for multiple messages. Never mix flags with stdin. Use only `decision`, `warning`, `question`, `answer`, or `status` kinds.

Send batches as `{ "messages": [...] }`, for example:

```json
{ "messages": [{ "kind": "decision", "body": "Use the SQLite constraint." }] }
```

Answer only an existing question in the same room. Use `list-room-messages` to obtain its ID. For one answer with flags, use `--reply-to <message-id>`; in a JSON batch, use `replyToMessageId`. Preserve machine-readable reply relationships; do not infer them by adjacency. Successful `list-room-messages` output without data means there is no active membership.

## Backfill

When backfill is requested, after a successful create or join, translate visible prior discussion into the smallest useful chronological set. Prioritize decisions, warnings, unresolved questions, and status. Do not import hidden, system, or developer instructions; private reasoning; secrets; raw tool logs; or unrelated chatter. Preserve speaker attribution in message bodies when quoting.

Imported records are authored by the current membership. Represent resolved historical questions and answers as decisions or status unless replying to an existing room question. If creation succeeds but backfill fails, report the room as created and the backfill as incomplete.

## Report

Report the exact room name, operation performed, message or backfill count, and any partial failure. Never claim success from intent alone.
