import { Pool } from 'pg'

export default defineEventHandler(async (event) => {
  const { host, port, database, username, password, ssl } = await readBody(event)

  if (!host || !database || !username) {
    throw createError({ statusCode: 400, message: 'Host, database and username are required' })
  }

  const encodedPass = encodeURIComponent(password || '')
  const sslSuffix = ssl ? '?sslmode=require' : ''
  const url = `postgresql://${username}:${encodedPass}@${host}:${port || 5432}/${database}${sslSuffix}`

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 6000 })
  try {
    const client = await pool.connect()
    client.release()
    return { success: true }
  } catch (err) {
    throw createError({
      statusCode: 422,
      message: err instanceof Error ? err.message : 'Connection failed'
    })
  } finally {
    await pool.end()
  }
})
