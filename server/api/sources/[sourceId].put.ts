import { eq } from 'drizzle-orm'
import { backupSources } from '../../database/schema'
import { encryptConfig } from '../../utils/encryption'

export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'sourceId')
  if (!sourceId) throw createError({ statusCode: 400, message: 'Source ID required' })

  const body = await readBody(event)
  const db = useDB()

  const [source] = await db.update(backupSources).set({
    name: body.name,
    type: body.type,
    config: encryptConfig(body.config),
    sshConnectionId: body.sshConnectionId || null,
    updatedAt: new Date()
  }).where(eq(backupSources.id, sourceId)).returning()

  if (!source) throw createError({ statusCode: 404, message: 'Source not found' })
  return { ...source, config: body.config }
})
