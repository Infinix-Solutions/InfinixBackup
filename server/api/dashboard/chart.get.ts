import { sql, eq, gte, and } from 'drizzle-orm'
import { backupRuns } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rows = await db.select({
    day: sql<string>`date_trunc('day', started_at)::date::text`,
    status: backupRuns.status,
    count: sql<number>`count(*)::int`
  })
    .from(backupRuns)
    .where(and(
      gte(backupRuns.startedAt, since7d),
      sql`status IN ('success', 'failed')`
    ))
    .groupBy(sql`date_trunc('day', started_at)::date`, backupRuns.status)
    .orderBy(sql`date_trunc('day', started_at)::date`)

  const days: Record<string, { success: number, failed: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    days[key] = { success: 0, failed: 0 }
  }

  for (const row of rows) {
    const key = row.day
    if (days[key]) {
      if (row.status === 'success') days[key].success = row.count
      else if (row.status === 'failed') days[key].failed = row.count
    }
  }

  return Object.entries(days).map(([date, counts]) => ({ date, ...counts }))
})
