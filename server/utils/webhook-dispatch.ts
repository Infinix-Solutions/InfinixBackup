import { createHmac } from 'crypto'
import { eq } from 'drizzle-orm'
import { webhooks } from '../database/schema'

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
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function buildDiscordPayload(event: string, data: WebhookPayload) {
  const isSuccess = event === 'backup.success'
  const color = isSuccess ? 0x2ECC71 : 0xE74C3C
  const icon = isSuccess ? '✅' : '❌'
  const fields = [
    { name: 'Status', value: data.run.status, inline: true },
    { name: 'Size', value: formatBytes(data.run.fileSizeBytes), inline: true }
  ]
  if (data.run.fileName) {
    fields.push({ name: 'File', value: data.run.fileName, inline: false })
  }
  if (!isSuccess && data.run.errorMessage) {
    fields.push({ name: 'Error', value: data.run.errorMessage.slice(0, 1000), inline: false })
  }
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

function buildSlackPayload(event: string, data: WebhookPayload) {
  const isSuccess = event === 'backup.success'
  const icon = isSuccess ? ':white_check_mark:' : ':x:'
  const label = isSuccess ? 'Backup succeeded' : 'Backup failed'
  let text = `${icon} *${data.job.name}* — ${label}\nSize: ${formatBytes(data.run.fileSizeBytes)}`
  if (!isSuccess && data.run.errorMessage) {
    text += `\nError: ${data.run.errorMessage.slice(0, 500)}`
  }
  return {
    text,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }]
  }
}

function buildGenericPayload(event: string, data: WebhookPayload) {
  return {
    event,
    timestamp: new Date().toISOString(),
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

export async function sendWebhook(webhook: typeof webhooks.$inferSelect, event: string, data: WebhookPayload): Promise<void> {
  const type = webhook.type as string

  if (type === 'openwa') {
    const icon = event === 'backup.success' ? '✅' : '❌'
    const text = `${icon} *${data.job.name}*\nStatus: ${data.run.status}\nSize: ${formatBytes(data.run.fileSizeBytes)}`
    await $fetch(`${webhook.url}/message/sendText`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${webhook.secret ?? ''}` },
      body: { chatId: webhook.chatId, text }
    })
    return
  }

  let body: object
  if (type === 'discord') {
    body = buildDiscordPayload(event, data)
  } else if (type === 'slack') {
    body = buildSlackPayload(event, data)
  } else {
    body = buildGenericPayload(event, data)
  }

  const bodyStr = JSON.stringify(body)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (type === 'generic' && webhook.secret) {
    const sig = createHmac('sha256', webhook.secret).update(bodyStr).digest('hex')
    headers['X-Webhook-Signature'] = `sha256=${sig}`
  }
  headers['X-Webhook-Event'] = event

  await $fetch(webhook.url, { method: 'POST', headers, body: bodyStr })
}

export async function dispatchWebhooks(event: string, data: WebhookPayload): Promise<void> {
  const db = useDB()
  const rows = await db.select().from(webhooks).where(eq(webhooks.enabled, true))
  const targets = rows.filter(w => (w.events as string[]).includes(event))

  await Promise.allSettled(
    targets.map(w =>
      sendWebhook(w, event, data).catch((err: unknown) =>
        console.error(`[webhook:${w.id}] failed to dispatch ${event}:`, (err as Error)?.message ?? err)
      )
    )
  )
}
