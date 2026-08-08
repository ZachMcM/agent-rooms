import { Command } from 'commander'

export function installCommand(): Command {
  return new Command('install')
    .description('Install the skill, slash command, and hook config for an agent')
    .option('--agent <agent>', 'claude-code | codex', 'claude-code')
    .action(() => {
      // TODO: copy the agent assets into place, then merge buildHookSettings(binaryPath()) from
      // ../hooks/settings into the target settings.json. Hook config is generated, never an asset.
      // TODO: store a version marker and content hash beside each installed file. On upgrade,
      // replace silently if unmodified; if modified, leave it, warn, and show the diff.
      throw new Error('not implemented')
    })
}
