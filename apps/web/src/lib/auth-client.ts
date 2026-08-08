import { AUTH_BASE_PATH } from '@agent-rooms/protocol'
import { createAuthClient } from 'better-auth/react'

// No baseURL on purpose. The SPA is served by the same api it calls, locally and in cloud alike,
// so the origin is whatever the page was loaded from and only the path is a shared contract.
//
// Constructed at module scope rather than per render: the client owns the session store the
// useSession hook subscribes to, and a second instance would be a second, diverging store.
export const authClient = createAuthClient({ basePath: AUTH_BASE_PATH })
