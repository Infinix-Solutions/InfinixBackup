import cron from 'node-cron'
import { backupJobs, jobDestinations } from '../../database/schema'
import { scheduleJob } from '../../plugins/scheduler'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const destinationIds: string[] = Array.isArray(body.destinationIds) ? body.destinationIds : []

  if (!body.name || !body.sourceId || destinationIds.length === 0 || !body.schedule) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  if (!cron.validate(body.schedule)) {
    throw createError({ statusCode: 400, message: 'Invalid cron expression' })
  }

  const db = useDB()
  const [job] = await db.insert(backupJobs).values({
    name: body.name,
    sourceId: body.sourceId,
    schedule: body.schedule,
    enabled: body.enabled ?? true,
    retentionDays: body.retentionDays ?? 30,
    retentionCount: body.retentionCount ?? 0,
    compression: body.compression ?? 'gzip',
    filenamePrefix: body.filenamePrefix ?? 'backup'
  }).returning()

  if (!job) throw createError({ statusCode: 500, message: 'Failed to create job' })

  await db.insert(jobDestinations).values(
    destinationIds.map(destinationId => ({ jobId: job.id, destinationId }))
  )

  if (job.enabled) {
    scheduleJob(job.id, job.schedule)
  }

  setResponseStatus(event, 201)
  return job
})
