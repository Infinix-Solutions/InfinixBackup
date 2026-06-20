import { eq } from 'drizzle-orm'
import { backupDestinations } from '../../database/schema'
import { decryptConfig } from '../../utils/encryption'

export default defineEventHandler(async (event) => {
  const destId = getRouterParam(event, 'destId')
  if (!destId) throw createError({ statusCode: 400, message: 'Destination ID required' })

  const db = useDB()
  const dest = await db.query.backupDestinations.findFirst({
    where: eq(backupDestinations.id, destId)
  })

  if (!dest) throw createError({ statusCode: 404, message: 'Destination not found' })
  return { ...dest, config: decryptConfig(dest.config) }
})
