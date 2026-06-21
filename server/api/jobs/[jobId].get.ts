import { eq } from 'drizzle-orm'
import { backupJobs } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) throw createError({ statusCode: 400, message: 'Job ID required' })

  const db = useDB()
  const job = await db.query.backupJobs.findFirst({
    where: eq(backupJobs.id, jobId),
    with: {
      source: true,
      jobDestinations: { with: { destination: true } }
    }
  })

  if (!job) throw createError({ statusCode: 404, message: 'Job not found' })

  const { jobDestinations: jd, ...rest } = job
  return {
    ...rest,
    destinationIds: jd.map(d => d.destinationId),
    destinations: jd.map(d => ({ id: d.destination.id, name: d.destination.name, type: d.destination.type }))
  }
})
