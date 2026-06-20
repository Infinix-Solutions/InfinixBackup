import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { resolve } from 'node:path'

export default defineEventHandler(async () => {
  const dbUrl = process.env.DATABASE_URL || (useRuntimeConfig().databaseUrl as string)
  if (!dbUrl) {
    throw createError({ statusCode: 400, message: 'Database not configured. Complete the database setup step first.' })
  }

  const pool = new Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 8000 })
  try {
    const db = drizzle(pool)
    const migrationsFolder = resolve(process.cwd(), 'server/database/migrations')
    await migrate(db, { migrationsFolder })
    return { success: true }
  } catch (err) {
    throw createError({
      statusCode: 422,
      message: err instanceof Error ? err.message : 'Migration failed'
    })
  } finally {
    await pool.end()
  }
})
