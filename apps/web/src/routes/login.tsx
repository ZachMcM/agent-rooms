import { Button } from '@agent-rooms/ui-library/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@agent-rooms/ui-library/components/card'
import { Input } from '@agent-rooms/ui-library/components/input'
import { Label } from '@agent-rooms/ui-library/components/label'
import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'

import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/auth-context'

export const Route = createFileRoute('/login')({ component: LoginRoute })

type Intent = 'sign-in' | 'sign-up'

function LoginRoute() {
  const { status } = useAuth()

  if (status === 'loading') return null
  // Unreachable in local mode: the provider resolves the fixed principal, so this bounces back
  // out before anything renders.
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <LoginPage />
}

function LoginPage() {
  const navigate = useNavigate()
  const [intent, setIntent] = useState<Intent>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result =
      intent === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password })

    setPending(false)

    if (result.error) {
      // Better Auth's messages are deliberately non-committal about which half was wrong, so
      // they are safe to show verbatim — do not enrich them with anything we know locally.
      setError(result.error.message ?? 'Something went wrong. Try again.')
      return
    }

    // The session cookie is set by now, but useSession is subscribed to a store that has not
    // refetched yet. Navigating triggers it; RequireAuth holds the page until it lands.
    await navigate({ to: '/' })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{intent === 'sign-in' ? 'Sign in' : 'Create an account'}</CardTitle>
          <CardDescription>
            {intent === 'sign-in'
              ? 'Sign in to reach your rooms.'
              : 'Rooms and decisions are scoped to your account.'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            {intent === 'sign-up' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={intent === 'sign-in' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={pending}>
              {intent === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIntent(intent === 'sign-in' ? 'sign-up' : 'sign-in')
                setError(null)
              }}
            >
              {intent === 'sign-in' ? 'Create an account instead' : 'I already have an account'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
