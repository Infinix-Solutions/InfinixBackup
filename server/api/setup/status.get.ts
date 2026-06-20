import { Pool } from 'pg'

export default defineEventHandler(async () => {
  const dbUrl = process.env.DATABASE_URL || (useRuntimeConfig().databaseUrl as string)

  if (!dbUrl) {
    return { installed: false, reason: 'no_database_url' }
  }

  const pool = new Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 3000 })

  try {
    const client = await pool.connect()
    try {
      const { rows: tableRows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'backup_sources'
        ) AS exists
      `)
      if (!tableRows[0].exists) return { installed: false, reason: 'no_schema' }

      const { rows: userRows } = await client.query('SELECT COUNT(*)::int AS total FROM users')
      if (userRows[0].total === 0) return { installed: false, reason: 'no_admin' }

      return { installed: true }
    } finally {
      client.release()
    }
  } catch {
    return { installed: false, reason: 'db_error' }
  } finally {
    await pool.end()
  }
})
