import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../database/schema'

let _pool: Pool | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDB() {
  if (!_db) {
    const dbUrl = process.env.DATABASE_URL || (useRuntimeConfig().databaseUrl as string)
    if (!dbUrl) throw new Error('DATABASE_URL not configured')
    _pool = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
    _db = drizzle(_pool, { schema })
  }
  return _db
}

export async function runMigrations() {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator')
  const db = useDB()
  await migrate(db, { migrationsFolder: './server/database/migrations' })
}
