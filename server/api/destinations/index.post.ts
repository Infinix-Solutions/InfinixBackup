import { backupDestinations } from '../../database/schema'
import { encryptConfig } from '../../utils/encryption'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.type || !body.config) {
    throw createError({ statusCode: 400, message: 'Missing required fields: name, type, config' })
  }

  const db = useDB()
  const [dest] = await db.insert(backupDestinations).values({
    name: body.name,
    type: body.type,
    config: encryptConfig(body.config)
  }).returning()

  setResponseStatus(event, 201)
  return { ...dest, config: body.config }
})
