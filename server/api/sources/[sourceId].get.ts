import { eq } from 'drizzle-orm'
import { backupSources } from '../../database/schema'
import { decryptConfig } from '../../utils/encryption'

export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'sourceId')
  if (!sourceId) throw createError({ statusCode: 400, message: 'Source ID required' })

  const db = useDB()
  const source = await db.query.backupSources.findFirst({
    where: eq(backupSources.id, sourceId)
  })

  if (!source) throw createError({ statusCode: 404, message: 'Source not found' })
  return { ...source, config: decryptConfig(source.config) }
})
