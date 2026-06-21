export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '-'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDuration(
  startedAt: string | Date,
  completedAt?: string | Date | null
): string {
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  files: 'Files / Directory',
  mongodb: 'MongoDB',
  docker_postgresql: 'Docker → PostgreSQL',
  docker_mysql: 'Docker → MySQL',
  docker_mongodb: 'Docker → MongoDB',
  docker_folder: 'Docker → Folder / Volume'
}

export const DESTINATION_TYPE_LABELS: Record<string, string> = {
  s3: 'S3 / S3-Compatible',
  ftp: 'FTP',
  sftp: 'SFTP',
  local: 'Local Filesystem'
}

export const SOURCE_TYPE_ICONS: Record<string, string> = {
  postgresql: 'i-simple-icons-postgresql',
  mysql: 'i-simple-icons-mysql',
  mongodb: 'i-simple-icons-mongodb',
  files: 'i-lucide-folder',
  docker_postgresql: 'i-simple-icons-docker',
  docker_mysql: 'i-simple-icons-docker',
  docker_mongodb: 'i-simple-icons-docker',
  docker_folder: 'i-simple-icons-docker'
}

export const DESTINATION_TYPE_ICONS: Record<string, string> = {
  s3: 'i-simple-icons-amazons3',
  ftp: 'i-lucide-server',
  sftp: 'i-lucide-shield',
  local: 'i-lucide-hard-drive'
}

export const CRON_PRESETS = [
  { label: 'schedule.hourly', value: '0 * * * *' },
  { label: 'schedule.every_6_hours', value: '0 */6 * * *' },
  { label: 'schedule.every_12_hours', value: '0 */12 * * *' },
  { label: 'schedule.daily_midnight', value: '0 0 * * *' },
  { label: 'schedule.daily_2am', value: '0 2 * * *' },
  { label: 'schedule.weekly_sunday', value: '0 0 * * 0' },
  { label: 'schedule.monthly_1st', value: '0 0 1 * *' }
]
