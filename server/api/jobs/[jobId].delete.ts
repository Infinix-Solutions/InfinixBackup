import { eq } from 'drizzle-orm'
import { backupJobs } from '../../database/schema'
import { unscheduleJob } from '../../plugins/scheduler'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) throw createError({ statusCode: 400, message: 'Job ID required' })

  const db = useDB()
  const [deleted] = await db.delete(backupJobs)
    .where(eq(backupJobs.id, jobId))
    .returning({ id: backupJobs.id })

  if (!deleted) throw createError({ statusCode: 404, message: 'Job not found' })

  unscheduleJob(jobId)
  return sendNoContent(event)
})
