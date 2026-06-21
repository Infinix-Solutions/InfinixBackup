import { eq } from 'drizzle-orm'
import { webhooks, jobWebhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Webhook ID required' })

  const db = useDB()
  const rows = await db
    .select({ webhook: webhooks, jobWebhook: jobWebhooks })
    .from(webhooks)
    .leftJoin(jobWebhooks, eq(webhooks.id, jobWebhooks.webhookId))
    .where(eq(webhooks.id, id))

  if (!rows.length) throw createError({ statusCode: 404, message: 'Webhook not found' })

  const result = { ...rows[0]!.webhook, jobIds: rows.flatMap(r => r.jobWebhook ? [r.jobWebhook.jobId] : []) }
  return result
})
