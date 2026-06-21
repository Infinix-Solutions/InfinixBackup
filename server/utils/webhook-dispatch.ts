import { createHmac } from 'crypto'
import { eq } from 'drizzle-orm'
import { webhooks, jobWebhooks } from '../database/schema'

interface WebhookRunData {
  id: string
  status: string
  fileName: string | null
  fileSizeBytes: number | null
  startedAt: Date
  completedAt: Date | null
  errorMessage?: string | null
}

interface WebhookJobData {
  id: string
  name: string
  nextRunAt?: Date | null
}

interface WebhookPayload {
  job: WebhookJobData
  run: WebhookRunData
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function renderTemplate(template: string, event: string, data: WebhookPayload): string {
  const durationMs = data.run.completedAt
    ? data.run.completedAt.getTime() - data.run.startedAt.getTime()
    : 0
  const duration = durationMs > 0
    ? durationMs < 60000
      ? `${Math.round(durationMs / 1000)}s`
      : `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
    : ''

  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => {
    switch (key) {
      case 'job.name': return data.job.name
      case 'job.id': return data.job.id
      case 'event': return event
      case 'run.status': return data.run.status
      case 'run.id': return data.run.id
      case 'run.fileName': return data.run.fileName ?? ''
      case 'run.fileSize': return formatBytes(data.run.fileSizeBytes)
      case 'run.startedAt': return data.run.startedAt.toISOString()
      case 'run.completedAt': return data.run.completedAt?.toISOString() ?? ''
      case 'run.duration': return duration
      case 'run.error': return data.run.errorMessage ?? ''
      case 'job.nextAt': return data.job.nextRunAt
        ? data.job.nextRunAt.toLocaleString(undefined, { timeZoneName: 'short' })
        : ''
      default: return `{{${key}}}`
    }
  })
}

function buildDiscordPayload(event: string, data: WebhookPayload, template?: string | null) {
  const isSuccess = event === 'backup.success'
  const color = isSuccess ? 0x2ECC71 : 0xE74C3C
  const icon = isSuccess ? '✅' : '❌'

  if (template) {
    return {
      embeds: [{
        title: `${icon} ${data.job.name}`,
        description: renderTemplate(template, event, data),
        color,
        timestamp: (data.run.completedAt ?? data.run.startedAt).toISOString(),
        footer: { text: 'Infinix Backup' }
      }]
    }
  }

  const fields = [
    { name: 'Status', value: data.run.status, inline: true },
    { name: 'Size', value: formatBytes(data.run.fileSizeBytes), inline: true }
  ]
  if (data.run.fileName) fields.push({ name: 'File', value: data.run.fileName, inline: false })
  if (!isSuccess && data.run.errorMessage) fields.push({ name: 'Error', value: data.run.errorMessage.slice(0, 1000), inline: false })

  return {
    embeds: [{
      title: `${icon} ${data.job.name}`,
      color,
      fields,
      timestamp: (data.run.completedAt ?? data.run.startedAt).toISOString(),
      footer: { text: 'Infinix Backup' }
    }]
  }
}

function buildSlackPayload(event: string, data: WebhookPayload, template?: string | null) {
  const isSuccess = event === 'backup.success'
  const icon = isSuccess ? ':white_check_mark:' : ':x:'

  const text = template
    ? renderTemplate(template, event, data)
    : (() => {
        let t = `${icon} *${data.job.name}* — ${isSuccess ? 'Backup succeeded' : 'Backup failed'}\nSize: ${formatBytes(data.run.fileSizeBytes)}`
        if (!isSuccess && data.run.errorMessage) t += `\nError: ${data.run.errorMessage.slice(0, 500)}`
        return t
      })()

  return { text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] }
}

function buildGenericPayload(event: string, data: WebhookPayload, template?: string | null) {
  return {
    event,
    timestamp: new Date().toISOString(),
    ...(template ? { message: renderTemplate(template, event, data) } : {}),
    job: { id: data.job.id, name: data.job.name },
    run: {
      id: data.run.id,
      status: data.run.status,
      fileName: data.run.fileName,
      fileSizeBytes: data.run.fileSizeBytes,
      startedAt: data.run.startedAt.toISOString(),
      completedAt: data.run.completedAt?.toISOString() ?? null,
      errorMessage: data.run.errorMessage ?? null
    }
  }
}

export async function sendWebhook(
  webhook: typeof webhooks.$inferSelect,
  event: string,
  data: WebhookPayload
): Promise<void> {
  const type = webhook.type as string
  const tpl = webhook.messageTemplate || null

  if (type === 'openwa') {
    const icon = event === 'backup.success' ? '✅' : '❌'
    const text = tpl
      ? renderTemplate(tpl, event, data)
      : `${icon} *${data.job.name}*\nStatus: ${data.run.status}\nSize: ${formatBytes(data.run.fileSizeBytes)}`
    const sessionId = webhook.sessionId
    if (!sessionId) throw new Error('OpenWA webhook missing sessionId')
    await $fetch(`${webhook.url}/api/sessions/${sessionId}/messages/send-text`, {
      method: 'POST',
      headers: { 'X-API-Key': webhook.secret ?? '' },
      body: { chatId: webhook.chatId, text }
    })
    return
  }

  let body: object
  if (type === 'discord') body = buildDiscordPayload(event, data, tpl)
  else if (type === 'slack') body = buildSlackPayload(event, data, tpl)
  else body = buildGenericPayload(event, data, tpl)

  const bodyStr = JSON.stringify(body)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (type === 'generic' && webhook.secret) {
    headers['X-Webhook-Signature'] = `sha256=${createHmac('sha256', webhook.secret).update(bodyStr).digest('hex')}`
  }
  headers['X-Webhook-Event'] = event

  await $fetch(webhook.url, { method: 'POST', headers, body: bodyStr })
}

export async function dispatchWebhooks(event: string, data: WebhookPayload, jobId: string): Promise<void> {
  const db = useDB()

  const rows = await db
    .select({ webhook: webhooks, jobWebhook: jobWebhooks })
    .from(webhooks)
    .leftJoin(jobWebhooks, eq(webhooks.id, jobWebhooks.webhookId))
    .where(eq(webhooks.enabled, true))

  const webhookMap = new Map<string, typeof webhooks.$inferSelect & { jobIds: string[] }>()
  for (const row of rows) {
    if (!webhookMap.has(row.webhook.id)) {
      webhookMap.set(row.webhook.id, { ...row.webhook, jobIds: [] })
    }
    if (row.jobWebhook) {
      webhookMap.get(row.webhook.id)!.jobIds.push(row.jobWebhook.jobId)
    }
  }

  const targets = [...webhookMap.values()].filter((w) => {
    if (!(w.events as string[]).includes(event)) return false
    return w.jobIds.length === 0 || w.jobIds.includes(jobId)
  })

  await Promise.allSettled(
    targets.map(w =>
      sendWebhook(w, event, data).catch((err: unknown) =>
        console.error(`[webhook:${w.id}] failed:`, (err as Error)?.message ?? err)
      )
    )
  )
}
