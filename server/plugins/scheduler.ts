import cron from 'node-cron'
import { eq } from 'drizzle-orm'
import { backupJobs } from '../database/schema'
import { useDB } from '../utils/db'
import { executeBackupJob } from '../utils/executor'
import { applyRetentionAll } from '../utils/retention'

type ScheduledTask = ReturnType<typeof cron.schedule>

declare global {

  var __backupScheduler: Map<string, ScheduledTask> | undefined

  var __retentionTask: ScheduledTask | undefined
}

export default defineNitroPlugin(async () => {
  if (globalThis.__backupScheduler) {
    for (const task of globalThis.__backupScheduler.values()) {
      task.stop()
    }
  }
  globalThis.__backupScheduler = new Map()

  if (globalThis.__retentionTask) {
    globalThis.__retentionTask.stop()
  }

  await initScheduler()
  initRetentionSchedule()
})

async function initScheduler() {
  const dbUrl = process.env.DATABASE_URL || (useRuntimeConfig().databaseUrl as string)
  if (!dbUrl) {
    console.log('[scheduler] No database configured yet — skipping init')
    return
  }

  const db = useDB()
  try {
    const jobs = await db.select().from(backupJobs).where(eq(backupJobs.enabled, true))
    console.log(`[scheduler] Loading ${jobs.length} enabled backup jobs`)
    for (const job of jobs) {
      scheduleJob(job.id, job.schedule)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.log('[scheduler] Database tables not yet created — complete setup to initialize')
    } else {
      console.error('[scheduler] Failed to initialize:', err)
    }
  }
}

function initRetentionSchedule() {
  globalThis.__retentionTask = cron.schedule('30 3 * * *', async () => {
    console.log('[scheduler] Running daily retention cleanup...')
    try {
      const results = await applyRetentionAll()
      const totalDeleted = results.reduce((s, r) => s + r.deleted, 0)
      const totalFreed = results.reduce((s, r) => s + r.freedBytes, 0)
      if (totalDeleted > 0) {
        console.log(`[scheduler] Retention cleanup: deleted ${totalDeleted} backups, freed ${totalFreed} bytes`)
      }
    } catch (err) {
      console.error('[scheduler] Retention cleanup failed:', err)
    }
  })
  console.log('[scheduler] Daily retention cleanup scheduled at 03:30')
}

export function scheduleJob(jobId: string, schedule: string) {
  const scheduler = globalThis.__backupScheduler!

  const existing = scheduler.get(jobId)
  if (existing) {
    existing.stop()
    scheduler.delete(jobId)
  }

  if (!cron.validate(schedule)) {
    console.error(`[scheduler] Invalid cron expression for job ${jobId}: ${schedule}`)
    return
  }

  const task = cron.schedule(schedule, async () => {
    console.log(`[scheduler] Triggering job ${jobId}`)
    try {
      await executeBackupJob(jobId)
    } catch (err) {
      console.error(`[scheduler] Job ${jobId} failed:`, err)
    }
  })

  scheduler.set(jobId, task)
  console.log(`[scheduler] Scheduled job ${jobId}: ${schedule}`)
}

export function unscheduleJob(jobId: string) {
  const scheduler = globalThis.__backupScheduler
  if (!scheduler) return

  const task = scheduler.get(jobId)
  if (task) {
    task.stop()
    scheduler.delete(jobId)
    console.log(`[scheduler] Unscheduled job ${jobId}`)
  }
}
