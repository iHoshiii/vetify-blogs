import { parseConfig } from './config.js'
import { connectDatabase } from './data/database.js'
import { Store } from './data/store.js'
import { createApp } from './app.js'

const config = parseConfig(process.env)
const { db, client } = await connectDatabase(config.MONGODB_URI)
const server = createApp(config, new Store(db, client)).listen(config.PORT, '127.0.0.1', () => {
  console.log(`Blog API listening on http://127.0.0.1:${config.PORT}`)
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => { void client.close().then(() => process.exit(0)) }))
}
