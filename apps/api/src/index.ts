import { createApp } from './app'

const host = process.env.AGENT_ROOMS_HOST ?? '127.0.0.1'
const port = Number(process.env.AGENT_ROOMS_PORT ?? '61937')
createApp().listen(port, host, () => process.stdout.write(`Listening on: http://${host}:${port}\n`))
