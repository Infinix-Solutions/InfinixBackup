import { eq } from 'drizzle-orm'
import { backupJobs, backupSources, backupDestinations, jobDestinations } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const jobs = await db
    .select({
      id: backupJobs.id,
      name: backupJobs.name,
      schedule: backupJobs.schedule,
      enabled: backupJobs.enabled,
      retentionDays: backupJobs.retentionDays,
      compression: backupJobs.compression,
      filenamePrefix: backupJobs.filenamePrefix,
      createdAt: backupJobs.createdAt,
      lastRunAt: backupJobs.lastRunAt,
      nextRunAt: backupJobs.nextRunAt,
      sourceId: backupJobs.sourceId,
      sourceName: backupSources.name,
      sourceType: backupSources.type
    })
    .from(backupJobs)
    .leftJoin(backupSources, eq(backupJobs.sourceId, backupSources.id))
    .orderBy(backupJobs.createdAt)

  const jobIds = jobs.map(j => j.id)
  if (jobIds.length === 0) return []

  const destRows = await db
    .select({
      jobId: jobDestinations.jobId,
      id: backupDestinations.id,
      name: backupDestinations.name,
      type: backupDestinations.type
    })
    .from(jobDestinations)
    .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))

  const destByJob = new Map<string, Array<{ id: string, name: string, type: string }>>()
  for (const row of destRows) {
    if (!destByJob.has(row.jobId)) destByJob.set(row.jobId, [])
    destByJob.get(row.jobId)!.push({ id: row.id, name: row.name, type: row.type })
  }

  return jobs.map(job => ({
    ...job,
    destinations: destByJob.get(job.id) ?? []
  }))
})
