import { eq } from 'drizzle-orm'
import { sshConnections } from '../../../database/schema'
import { probeServer } from '../../../utils/ssh/probe'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID required' })

  const db = useDB()
  const [conn] = await db.select().from(sshConnections).where(eq(sshConnections.id, id))
  if (!conn) throw createError({ statusCode: 404, message: 'SSH connection not found' })

  const pkData = conn.privateKey as Record<string, unknown>
  const privateKey = (pkData.pem as string) || ''

  try {
    const result = await probeServer({ host: conn.host, port: conn.port, username: conn.username, privateKey })
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, message: `SSH probe failed: ${msg}` })
  }
})
