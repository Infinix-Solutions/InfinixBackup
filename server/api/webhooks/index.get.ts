import { eq } from 'drizzle-orm'
import { webhooks, jobWebhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const db = useDB()

  const rows = await db
    .select({ webhook: webhooks, jobWebhook: jobWebhooks })
    .from(webhooks)
    .leftJoin(jobWebhooks, eq(webhooks.id, jobWebhooks.webhookId))
    .orderBy(webhooks.createdAt)

  const map = new Map<string, typeof webhooks.$inferSelect & { jobIds: string[] }>()
  for (const row of rows) {
    if (!map.has(row.webhook.id)) map.set(row.webhook.id, { ...row.webhook, jobIds: [] })
    if (row.jobWebhook) map.get(row.webhook.id)!.jobIds.push(row.jobWebhook.jobId)
  }

  return [...map.values()]
})
