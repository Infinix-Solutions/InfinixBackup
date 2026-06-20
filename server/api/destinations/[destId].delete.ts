import { eq } from 'drizzle-orm'
import { backupDestinations } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const destId = getRouterParam(event, 'destId')
  if (!destId) throw createError({ statusCode: 400, message: 'Destination ID required' })

  const db = useDB()
  const [deleted] = await db.delete(backupDestinations)
    .where(eq(backupDestinations.id, destId))
    .returning({ id: backupDestinations.id })

  if (!deleted) throw createError({ statusCode: 404, message: 'Destination not found' })
  return sendNoContent(event)
})
