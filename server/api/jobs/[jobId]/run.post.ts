import { eq } from 'drizzle-orm'
import { backupJobs } from '../../../database/schema'
import { executeBackupJob } from '../../../utils/executor'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) throw createError({ statusCode: 400, message: 'Job ID required' })

  const db = useDB()
  const job = await db.query.backupJobs.findFirst({
    where: eq(backupJobs.id, jobId)
  })
  if (!job) throw createError({ statusCode: 404, message: 'Job not found' })

  event.waitUntil(
    executeBackupJob(jobId).catch((err) => {
      console.error(`[manual-run] Job ${jobId} failed:`, err)
    })
  )

  setResponseStatus(event, 202)
  return { message: 'Backup started', jobId }
})
