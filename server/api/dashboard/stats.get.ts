import { sql, eq, gte, and, desc } from 'drizzle-orm'
import { backupSources, backupDestinations, backupJobs, backupRuns, jobDestinations } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    [{ sourcesCount = 0 } = {}],
    [{ destinationsCount = 0 } = {}],
    [{ jobsCount = 0 } = {}],
    [{ runsToday = 0 } = {}],
    [{ failuresToday = 0 } = {}],
    [{ totalSize = '0' } = {}],
    recentRuns
  ] = await Promise.all([
    db.select({ sourcesCount: sql<number>`count(*)::int` }).from(backupSources),
    db.select({ destinationsCount: sql<number>`count(*)::int` }).from(backupDestinations),
    db.select({ jobsCount: sql<number>`count(*)::int` }).from(backupJobs).where(eq(backupJobs.enabled, true)),
    db.select({ runsToday: sql<number>`count(*)::int` }).from(backupRuns).where(gte(backupRuns.startedAt, since24h)),
    db.select({ failuresToday: sql<number>`count(*)::int` }).from(backupRuns).where(
      and(eq(backupRuns.status, 'failed'), gte(backupRuns.startedAt, since24h))
    ),
    db.select({ totalSize: sql<string>`coalesce(sum(file_size_bytes), 0)::text` }).from(backupRuns).where(
      and(eq(backupRuns.status, 'success'), gte(backupRuns.startedAt, since7d))
    ),
    db.select({
      id: backupRuns.id,
      status: backupRuns.status,
      startedAt: backupRuns.startedAt,
      completedAt: backupRuns.completedAt,
      fileSizeBytes: backupRuns.fileSizeBytes,
      jobId: backupRuns.jobId,
      jobName: backupJobs.name,
      sourceName: backupSources.name
    })
      .from(backupRuns)
      .leftJoin(backupJobs, eq(backupRuns.jobId, backupJobs.id))
      .leftJoin(backupSources, eq(backupJobs.sourceId, backupSources.id))
      .orderBy(desc(backupRuns.startedAt))
      .limit(10)
  ])

  // Load destination names per job for recent runs
  const recentJobIds = [...new Set(recentRuns.map(r => r.jobId))]
  const destNameRows = recentJobIds.length > 0
    ? await db
        .select({ jobId: jobDestinations.jobId, name: backupDestinations.name })
        .from(jobDestinations)
        .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
    : []

  const destNamesByJob = new Map<string, string[]>()
  for (const row of destNameRows) {
    if (!destNamesByJob.has(row.jobId)) destNamesByJob.set(row.jobId, [])
    destNamesByJob.get(row.jobId)!.push(row.name)
  }

  return {
    sourcesCount,
    destinationsCount,
    jobsCount,
    runsToday,
    failuresToday,
    totalSizeBytes: Number(totalSize),
    recentRuns: recentRuns.map(r => ({ ...r, destinationNames: destNamesByJob.get(r.jobId) ?? [] }))
  }
})
