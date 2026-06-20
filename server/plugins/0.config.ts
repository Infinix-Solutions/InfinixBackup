import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineNitroPlugin(() => {
  const configPath = resolve(process.cwd(), 'data', 'config.json')
  if (!existsSync(configPath)) return

  try {
    const stored = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, string>

    if (!process.env.DATABASE_URL && stored.DATABASE_URL) {
      process.env.DATABASE_URL = stored.DATABASE_URL
    }
    if (!process.env.ENCRYPTION_KEY && stored.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = stored.ENCRYPTION_KEY
    }
    if (!process.env.SESSION_SECRET && stored.SESSION_SECRET) {
      process.env.SESSION_SECRET = stored.SESSION_SECRET
    }

    console.log('[config] Loaded from data/config.json')
  } catch (err) {
    console.error('[config] Failed to read data/config.json:', err)
  }
})
