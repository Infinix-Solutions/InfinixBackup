import { Pool } from 'pg'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const { host, port, database, username, password, ssl, encryptionKey, sessionSecret } = await readBody(event)

  if (!host || !database || !username) {
    throw createError({ statusCode: 400, message: 'Host, database and username are required' })
  }

  const encodedPass = encodeURIComponent(password || '')
  const sslSuffix = ssl ? '?sslmode=require' : ''
  const dbUrl = `postgresql://${username}:${encodedPass}@${host}:${port || 5432}/${database}${sslSuffix}`

  // Verify connection before saving
  const pool = new Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 6000 })
  try {
    const client = await pool.connect()
    client.release()
  } catch (err) {
    throw createError({
      statusCode: 422,
      message: err instanceof Error ? err.message : 'Database connection failed'
    })
  } finally {
    await pool.end()
  }

  // Use client-provided keys (from installer form) or fall back to generating
  const encKey = encryptionKey || process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex')
  const sessKey = sessionSecret || process.env.SESSION_SECRET || randomBytes(32).toString('hex')

  const configPath = resolve(process.cwd(), 'data', 'config.json')
  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, JSON.stringify({ DATABASE_URL: dbUrl, ENCRYPTION_KEY: encKey, SESSION_SECRET: sessKey }, null, 2))

  // Dev mode: apply env vars in-memory and skip process restart
  // Production (Docker): restart the container so 0.config.ts picks up data/config.json
  if (process.env.NODE_ENV !== 'production') {
    process.env.DATABASE_URL = dbUrl
    process.env.ENCRYPTION_KEY = encKey
    process.env.SESSION_SECRET = sessKey
    return { success: true, devReload: true }
  }

  setTimeout(() => process.exit(0), 400)
  return { success: true, restarting: true }
})
