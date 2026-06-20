import { sql } from 'drizzle-orm'
import { backupSources, backupJobs } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const sources = await db
    .select({
      id: backupSources.id,
      name: backupSources.name,
      type: backupSources.type,
      createdAt: backupSources.createdAt,
      updatedAt: backupSources.updatedAt,
      jobsCount: sql<number>`count(${backupJobs.id})::int`
    })
    .from(backupSources)
    .leftJoin(backupJobs, sql`${backupJobs.sourceId} = ${backupSources.id}`)
    .groupBy(backupSources.id)

  return sources
})
