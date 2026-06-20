import { eq } from 'drizzle-orm'
import { backupSources } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'sourceId')
  if (!sourceId) throw createError({ statusCode: 400, message: 'Source ID required' })

  const db = useDB()
  const [deleted] = await db.delete(backupSources).where(eq(backupSources.id, sourceId)).returning({ id: backupSources.id })

  if (!deleted) throw createError({ statusCode: 404, message: 'Source not found' })
  return sendNoContent(event)
})
