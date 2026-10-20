import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
const port = await new Promise((resolve, reject) => {
  const listener = createServer()
  listener.on('error', reject)
  listener.listen(0, '127.0.0.1', () => {
    const address = listener.address()
    listener.close(() => resolve(address.port))
  })
})
const server = spawn(process.execPath, ['dist/server/server/index.js'], {
  env: { ...process.env, NODE_ENV: 'test', PORT: String(port), MONGODB_URI: mongo.getUri('blog_build_test'),
    CLIENT_ORIGIN: 'http://localhost:5177', MAIN_AUTH_ORIGIN: 'http://localhost:8000',
    AUTH_CALLBACK_URL: 'http://localhost:5177/auth/callback', AUTH_ENABLED: 'false', GEMINI_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs += chunk.toString() })
server.stderr.on('data', chunk => { logs += chunk.toString() })
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (response.ok) { ready = true; break }
    } catch { ready = false }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error(`Built API did not start: ${logs.slice(-1500)}`)
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/blogs`)
  const body = await response.json()
  if (!response.ok || body.data.total !== 0) throw new Error('Built API did not return the empty public feed')
  console.log('Built API startup, health and public feed passed against disposable MongoDB.')
} finally {
  server.kill()
  await new Promise(resolve => { server.once('exit', resolve); setTimeout(resolve, 3000) })
  await mongo.stop()
}
