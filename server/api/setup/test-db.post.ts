import { Pool } from 'pg'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const databaseUrl: string = body.databaseUrl?.trim()

  if (!databaseUrl) {
    throw createError({ statusCode: 400, message: 'Database URL is required' })
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 8000
  })

  try {
    const client = await pool.connect()
    try {
      await client.query('SELECT version()')
      return { success: true, message: 'Connection successful' }
    } finally {
      client.release()
    }
  } catch (err) {
    throw createError({
      statusCode: 422,
      message: err instanceof Error ? err.message : 'Connection failed'
    })
  } finally {
    await pool.end()
  }
})
