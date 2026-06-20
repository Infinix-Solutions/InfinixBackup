import { eq, desc } from 'drizzle-orm'
import { backupRuns, backupJobs, backupSources, backupDestinations, jobDestinations } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const jobId = query.jobId as string | undefined
  const limit = Number(query.limit) || 50

  const db = useDB()

  const conditions = jobId ? [eq(backupRuns.jobId, jobId)] : []

  const runs = await db
    .select({
      id: backupRuns.id,
      status: backupRuns.status,
      startedAt: backupRuns.startedAt,
      completedAt: backupRuns.completedAt,
      fileName: backupRuns.fileName,
      fileSizeBytes: backupRuns.fileSizeBytes,
      errorMessage: backupRuns.errorMessage,
      jobId: backupRuns.jobId,
      jobName: backupJobs.name,
      sourceName: backupSources.name
    })
    .from(backupRuns)
    .leftJoin(backupJobs, eq(backupRuns.jobId, backupJobs.id))
    .leftJoin(backupSources, eq(backupJobs.sourceId, backupSources.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(backupRuns.startedAt))
    .limit(limit)

  const runJobIds = [...new Set(runs.map(r => r.jobId))]

  const destRows = runJobIds.length > 0
    ? await db
        .select({
          jobId: jobDestinations.jobId,
          name: backupDestinations.name
        })
        .from(jobDestinations)
        .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
    : []

  const destNamesByJob = new Map<string, string[]>()
  for (const row of destRows) {
    if (!destNamesByJob.has(row.jobId)) destNamesByJob.set(row.jobId, [])
    destNamesByJob.get(row.jobId)!.push(row.name)
  }

  return runs.map(run => ({
    ...run,
    destinationNames: destNamesByJob.get(run.jobId) ?? []
  }))
})
