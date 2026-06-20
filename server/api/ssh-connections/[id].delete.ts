import { eq } from 'drizzle-orm'
import { sshConnections } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID required' })

  const db = useDB()
  const [row] = await db.delete(sshConnections).where(eq(sshConnections.id, id)).returning({ id: sshConnections.id })
  if (!row) throw createError({ statusCode: 404, message: 'SSH connection not found' })

  return { success: true }
})
