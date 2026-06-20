import { backupSources } from '../../database/schema'
import { encryptConfig } from '../../utils/encryption'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.type || !body.config) {
    throw createError({ statusCode: 400, message: 'Missing required fields: name, type, config' })
  }

  const db = useDB()
  const [source] = await db.insert(backupSources).values({
    name: body.name,
    type: body.type,
    config: encryptConfig(body.config),
    sshConnectionId: body.sshConnectionId || null
  }).returning()

  setResponseStatus(event, 201)
  return { ...source, config: body.config }
})
