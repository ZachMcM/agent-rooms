import { account, session, user, verification } from './schema'

// The table map handed to Better Auth's drizzle adapter, kept here so nothing under apps/ has to
// reach into `@agent-rooms/db/schema` to build it.
//
// Passed explicitly rather than letting the adapter introspect the drizzle instance: createDatabase
// builds the client with drizzle 1.0's `relations` option, which does not expose the flat schema
// object the adapter would otherwise walk.
//
// The keys are Better Auth's model names, not ours. Renaming one re-points the adapter at a
// different table with no type error, so this map changes only when the generator's output does.
export const authTables = { user, session, account, verification }
