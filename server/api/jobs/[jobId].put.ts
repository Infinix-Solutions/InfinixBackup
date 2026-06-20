import cron from 'node-cron'
import { eq } from 'drizzle-orm'
import { backupJobs, jobDestinations } from '../../database/schema'
import { scheduleJob, unscheduleJob } from '../../plugins/scheduler'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) throw createError({ statusCode: 400, message: 'Job ID required' })

  const body = await readBody(event)

  if (body.schedule && !cron.validate(body.schedule)) {
    throw createError({ statusCode: 400, message: 'Invalid cron expression' })
  }

  const destinationIds: string[] = Array.isArray(body.destinationIds) ? body.destinationIds : []

  const db = useDB()
  const [job] = await db.update(backupJobs).set({
    name: body.name,
    sourceId: body.sourceId,
    schedule: body.schedule,
    enabled: body.enabled,
    retentionDays: body.retentionDays,
    retentionCount: body.retentionCount,
    compression: body.compression,
    filenamePrefix: body.filenamePrefix,
    updatedAt: new Date()
  }).where(eq(backupJobs.id, jobId)).returning()

  if (!job) throw createError({ statusCode: 404, message: 'Job not found' })

  if (destinationIds.length > 0) {
    await db.delete(jobDestinations).where(eq(jobDestinations.jobId, jobId))
    await db.insert(jobDestinations).values(
      destinationIds.map(destinationId => ({ jobId, destinationId }))
    )
  }

  if (job.enabled) {
    scheduleJob(job.id, job.schedule)
  } else {
    unscheduleJob(job.id)
  }

  return job
})
