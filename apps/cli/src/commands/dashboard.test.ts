import { describe, expect, it } from 'vitest'

import { CliError } from '../errors'
import { assertDashboardPortAvailable, parseDashboardPort } from './dashboard'

describe('dashboard command', () => {
  it('uses the private dynamic port by default', () => {
    expect(parseDashboardPort(undefined)).toBe(61937)
  })

  it.each(['1', '61937', '65535'])('accepts port %s', (value) => {
    expect(parseDashboardPort(value)).toBe(Number(value))
  })

  it.each(['0', '65536', '-1', '1.5', 'not-a-port'])('rejects port %s', (value) => {
    expect(() => parseDashboardPort(value)).toThrow(CliError)
  })

  it('rejects an occupied loopback port', async () => {
    let onError: ((error: Error & { code?: string }) => void) | undefined
    const server = {
      once(event: string, listener: (error: Error & { code?: string }) => void) {
        if (event === 'error') onError = listener
        return server
      },
      listen() {
        onError?.(Object.assign(new Error('in use'), { code: 'EADDRINUSE' }))
        return server
      },
    }

    await expect(assertDashboardPortAvailable(62437, () => server as never)).rejects.toMatchObject({
      code: 'port_in_use',
    })
  })
})
