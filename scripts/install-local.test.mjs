import assert from 'node:assert/strict'
import test from 'node:test'

import { completionMessage, forwardedInstallArguments } from './install-local.mjs'

const cliPackage = { name: 'agent-rooms', version: '1.2.3' }

test('normalizes the package-manager separator and forwards installer options', () => {
  assert.deepEqual(forwardedInstallArguments(['--', '--yes', '--dry-run']), ['--yes', '--dry-run'])
})

test('rejects forwarded package overrides', () => {
  assert.throws(() => forwardedInstallArguments(['--package', '/tmp/other.tgz']), /controls/)
  assert.throws(() => forwardedInstallArguments(['--package=/tmp/other.tgz']), /controls/)
})

test('does not report installation for help or dry runs', () => {
  assert.equal(completionMessage(['--help'], cliPackage, '/tmp/home'), undefined)
  assert.equal(completionMessage(['-h'], cliPackage, '/tmp/home'), undefined)
  assert.doesNotMatch(completionMessage(['--dry-run'], cliPackage, '/tmp/home'), /^Installed/)
  assert.match(completionMessage(['--dry-run'], cliPackage, '/tmp/home'), /no changes/)
})

test('reports the managed binary after installation', () => {
  assert.match(completionMessage([], cliPackage, '/tmp/home'), /^Installed managed/)
  assert.match(
    completionMessage([], cliPackage, '/tmp/home'),
    /\/tmp\/home\/\.agent-rooms\/bin\/agent-rooms/,
  )
})
