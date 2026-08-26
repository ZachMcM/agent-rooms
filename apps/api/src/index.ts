import { createApp } from './app'

const host = process.env.COORDROOMS_HOST ?? '127.0.0.1'
const port = Number(process.env.COORDROOMS_PORT ?? '61937')
createApp().listen(port, host, () => process.stdout.write(`Listening on: http://${host}:${port}\n`))
