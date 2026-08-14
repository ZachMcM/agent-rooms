import { runCli } from './program'

process.exitCode = await runCli(process.argv.slice(2))
