import { runMigrations } from '@agent-rooms/db'
import { createDatabase } from '@agent-rooms/db/client'
import { describe, expect, it } from 'vitest'

import { createApp } from './app'
import { createAuth } from './auth'

const SECRET = 'test-secret-that-is-at-least-32-characters'
const BASE_URL = 'http://localhost'

async function testDatabase() {
  const db = createDatabase({ url: ':memory:' })
  await runMigrations(db)
  return db
}

async function cloudApp() {
  const db = await testDatabase()
  return createApp({
    mode: 'cloud',
    db,
    auth: createAuth({ db, secret: SECRET, baseURL: BASE_URL }),
    version: 'test',
  })
}

async function localApp() {
  return createApp({
    mode: 'local',
    db: await testDatabase(),
    principal: { userId: 'local-user' },
    version: 'test',
  })
}

async function signUp(app: Awaited<ReturnType<typeof cloudApp>>) {
  const response = await app.request(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      password: 'correct horse battery staple',
    }),
  })
  return { response, cookie: response.headers.get('set-cookie') }
}

describe('cloud mode', () => {
  // Reaching /api/config without a session is what lets the SPA boot far enough to show a login
  // page. If the principal middleware ever creeps in front of it, cloud has no way in at all.
  it('serves the runtime config without a session', async () => {
    const app = await cloudApp()

    const response = await app.request('/api/config')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ mode: 'cloud', version: 'test', principal: null })
  })

  it('rejects a principal-scoped route without a session', async () => {
    const app = await cloudApp()

    const response = await app.request('/api/rooms')

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'unauthenticated' } })
  })

  // The end-to-end check that matters most: Better Auth's drizzle adapter declares a peer of
  // drizzle-orm ^0.45, and this repo runs 1.0.0-rc.4. A sign-up exercises insert-and-return
  // against three of its tables, so it fails loudly here rather than at a user's first login.
  it('signs a user up and resolves the session into a principal', async () => {
    const app = await cloudApp()

    const { response, cookie } = await signUp(app)
    expect(response.status).toBe(200)
    expect(cookie).toBeTruthy()

    const rooms = await app.request('/api/rooms', { headers: { cookie: cookie as string } })

    expect(rooms.status).toBe(200)
  })

  it('rejects a sign-in with the wrong password', async () => {
    const app = await cloudApp()
    await signUp(app)

    const response = await app.request(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'not the password' }),
    })

    expect(response.status).toBe(401)
  })
})

describe('local mode', () => {
  it('hands the fixed principal to the SPA and mounts no auth routes', async () => {
    const app = await localApp()

    const config = await app.request('/api/config')
    expect(await config.json()).toEqual({
      mode: 'local',
      version: 'test',
      principal: { userId: 'local-user' },
    })

    // Not 401: the local principal is always present. Not 200 either — Better Auth is absent
    // rather than disabled, so the path falls through to the static handler.
    const auth = await app.request(`${BASE_URL}/api/auth/sign-in/email`, { method: 'POST' })
    expect(auth.status).toBe(404)
  })

  it('resolves principal-scoped routes without any session', async () => {
    const app = await localApp()

    const response = await app.request('/api/rooms')

    expect(response.status).toBe(200)
  })
})
