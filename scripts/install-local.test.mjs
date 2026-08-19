import assert from 'node:assert/strict'
import test from 'node:test'

import { forwardedInstallArguments, run } from './install-local.mjs'

test('normalizes the package-manager separator and forwards installer options', () => {
  assert.deepEqual(forwardedInstallArguments(['--', '--yes', '--dry-run']), ['--yes', '--dry-run'])
})

test('rejects forwarded package overrides', () => {
  assert.throws(() => forwardedInstallArguments(['--package', '/tmp/other.tgz']), /controls/)
  assert.throws(() => forwardedInstallArguments(['--package=/tmp/other.tgz']), /controls/)
})

test('includes captured build output when a quiet command fails', async () => {
  const stderrWrite = process.stderr.write
  const output = []
  process.stderr.write = (message) => {
    output.push(String(message))
    return true
  }
  try {
    await assert.rejects(
      run(process.execPath, ['-e', "process.stderr.write('build failure');process.exit(1)"], {
        label: 'Building',
      }),
      /build failure/,
    )
    assert.deepEqual(output, ['- Building\n'])
  } finally {
    process.stderr.write = stderrWrite
  }
})

test('does not color progress when stderr is not a TTY', async () => {
  const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')
  const stderrTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY')
  const stderrWrite = process.stderr.write
  const output = []
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })
  Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false })
  process.stderr.write = (message) => {
    output.push(String(message))
    return true
  }
  try {
    await run(process.execPath, ['-e', ''], { label: 'Packing' })
    assert.match(output.join(''), /✔/)
    assert.equal(output.join('').includes('\u001B'), false)
  } finally {
    process.stderr.write = stderrWrite
    if (stdoutTTY) Object.defineProperty(process.stdout, 'isTTY', stdoutTTY)
    else delete process.stdout.isTTY
    if (stderrTTY) Object.defineProperty(process.stderr, 'isTTY', stderrTTY)
    else delete process.stderr.isTTY
  }
})
