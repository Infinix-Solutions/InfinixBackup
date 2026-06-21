declare type SourceType
  = | 'postgresql'
    | 'mysql'
    | 'mongodb'
    | 'files'
    | 'docker_postgresql'
    | 'docker_mysql'
    | 'docker_mongodb'
    | 'docker_folder'

declare type DestinationType = 's3' | 'ftp' | 'sftp' | 'local'
declare type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
declare type CompressionType = 'none' | 'gzip' | 'zip'
declare type UserRole = 'admin' | 'viewer'

declare interface ApiSource {
  id: string
  name: string
  type: SourceType
  createdAt: string
  updatedAt: string
  jobsCount: number
}

declare interface ApiSourceDetail {
  id: string
  name: string
  type: SourceType
  config: Record<string, unknown>
  sshConnectionId: string | null
  createdAt: string
  updatedAt: string
}

declare interface ApiDestination {
  id: string
  name: string
  type: DestinationType
  createdAt: string
  updatedAt: string
  jobsCount: number
}

declare interface ApiDestinationDetail {
  id: string
  name: string
  type: DestinationType
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

declare interface ApiJobDestination {
  id: string
  name: string
  type: DestinationType
}

declare interface ApiJob {
  id: string
  name: string
  schedule: string
  enabled: boolean
  retentionDays: number
  compression: CompressionType
  filenamePrefix: string | null
  createdAt: string
  lastRunAt: string | null
  nextRunAt: string | null
  sourceId: string
  sourceName: string | null
  sourceType: SourceType | null
  destinations: ApiJobDestination[]
}

declare interface ApiJobDetail {
  id: string
  name: string
  schedule: string
  enabled: boolean
  retentionDays: number
  retentionCount: number
  compression: CompressionType
  filenamePrefix: string | null
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
  nextRunAt: string | null
  sourceId: string
  destinationIds: string[]
  source: ApiSourceDetail | null
  destinations: ApiJobDestination[]
}

declare interface ApiRun {
  id: string
  status: RunStatus
  startedAt: string
  completedAt: string | null
  fileName: string | null
  fileSizeBytes: number | null
  errorMessage: string | null
  jobId: string
  jobName: string | null
  sourceName: string | null
  destinationNames: string[]
}

declare interface RunDestinationResult {
  id: string
  name: string
  type: string
  status: 'success' | 'failed'
  error?: string
}

declare interface ApiRunDetail {
  id: string
  status: RunStatus
  startedAt: string
  completedAt: string | null
  fileName: string | null
  fileSizeBytes: number | null
  errorMessage: string | null
  logs: string | null
  jobId: string
  createdAt: string
  destinationResults: RunDestinationResult[] | null
  job: (ApiJobDetail & {
    source: ApiSourceDetail
    destinations: ApiJobDestination[]
  }) | null
}

declare interface ApiDashboardStats {
  sourcesCount: number
  destinationsCount: number
  jobsCount: number
  runsToday: number
  failuresToday: number
  totalSizeBytes: number
  recentRuns: Array<{
    id: string
    status: RunStatus
    startedAt: string
    completedAt: string | null
    fileSizeBytes: number | null
    jobId: string
    jobName: string | null
    sourceName: string | null
    destinationNames: string[]
  }>
}

declare interface ApiUser {
  id: string
  username: string
  role: UserRole
  createdAt: string
}

declare interface ApiAuthUser {
  id: string
  username: string
  role: UserRole
}

declare interface ApiSshConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  publicKey: string
  createdAt: string
  updatedAt: string
  keyInstalling?: boolean
}

declare interface SshProbeResult {
  docker: boolean
  postgres: boolean
  mysql: boolean
  mongo: boolean
  containers: string[]
}

declare interface SourceFormData {
  name: string
  type: string
  config: Record<string, unknown>
  sshConnectionId?: string | null
}

declare interface DestinationFormData {
  name: string
  type: string
  config: Record<string, unknown>
}

declare type WebhookEvent = 'backup.success' | 'backup.failed'
declare type WebhookType = 'generic' | 'discord' | 'slack' | 'openwa'

declare interface ApiWebhook {
  id: string
  name: string
  type: WebhookType
  url: string
  events: WebhookEvent[]
  enabled: boolean
  secret: string | null
  chatId: string | null
  sessionId: string | null
  messageTemplate: string | null
  jobIds: string[]
  createdAt: string
  updatedAt: string
}

declare interface WebhookFormData {
  name: string
  type: WebhookType
  url: string
  events: WebhookEvent[]
  enabled: boolean
  secret: string
  chatId: string
  sessionId: string
  messageTemplate: string
  jobIds: string[]
}

declare interface JobFormData {
  name: string
  sourceId: string
  destinationIds: string[]
  schedule: string
  enabled: boolean
  retentionDays: number
  retentionCount: number
  compression: CompressionType
  filenamePrefix: string
}
