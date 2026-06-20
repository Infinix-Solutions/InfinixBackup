import { eq } from 'drizzle-orm'
import { backupDestinations } from '../../database/schema'
import { encryptConfig } from '../../utils/encryption'

export default defineEventHandler(async (event) => {
  const destId = getRouterParam(event, 'destId')
  if (!destId) throw createError({ statusCode: 400, message: 'Destination ID required' })

  const body = await readBody(event)
  const db = useDB()

  const [dest] = await db.update(backupDestinations).set({
    name: body.name,
    type: body.type,
    config: encryptConfig(body.config),
    updatedAt: new Date()
  }).where(eq(backupDestinations.id, destId)).returning()

  if (!dest) throw createError({ statusCode: 404, message: 'Destination not found' })
  return { ...dest, config: body.config }
})
