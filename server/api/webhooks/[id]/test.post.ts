import { eq } from 'drizzle-orm'
import { webhooks } from '../../../database/schema'
import { sendWebhook } from '../../../utils/webhook-dispatch'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Webhook ID required' })

  const db = useDB()
  const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id))
  if (!webhook) throw createError({ statusCode: 404, message: 'Webhook not found' })

  try {
    await sendWebhook(webhook, 'backup.success', {
      job: { id: 'test-000', name: 'Test Backup Job' },
      run: {
        id: 'test-run-000',
        status: 'success',
        fileName: 'backup_test.sql.gz',
        fileSizeBytes: 1024,
        startedAt: new Date(),
        completedAt: new Date(),
        errorMessage: null
      }
    })
  } catch (err: unknown) {
    throw createError({ statusCode: 502, message: (err as Error)?.message ?? 'Webhook delivery failed' })
  }

  return { success: true }
})
