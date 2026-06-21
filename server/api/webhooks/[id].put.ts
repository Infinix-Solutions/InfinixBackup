import { eq } from 'drizzle-orm'
import { webhooks, jobWebhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Webhook ID required' })

  const body = await readBody(event)
  const { name, type, url, events, enabled, secret, chatId, sessionId, jobIds, messageTemplate } = body

  if (!name || !url || !type || !Array.isArray(events) || events.length === 0) {
    throw createError({ statusCode: 400, message: 'name, url, type and at least one event are required' })
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw createError({ statusCode: 400, message: 'url must start with http:// or https://' })
  }

  const db = useDB()
  const [row] = await db.update(webhooks)
    .set({ name, type, url, events, enabled: enabled ?? true, secret: secret || null, chatId: chatId || null, sessionId: sessionId || null, messageTemplate: messageTemplate || null, updatedAt: new Date() })
    .where(eq(webhooks.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, message: 'Webhook not found' })

  await db.delete(jobWebhooks).where(eq(jobWebhooks.webhookId, id))
  if (Array.isArray(jobIds) && jobIds.length > 0) {
    await db.insert(jobWebhooks).values(jobIds.map((jobId: string) => ({ jobId, webhookId: id })))
  }

  return { ...row, jobIds: Array.isArray(jobIds) ? jobIds : [] }
})
