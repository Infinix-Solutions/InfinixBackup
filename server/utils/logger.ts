import * as Sentry from '@sentry/node'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  ts: string
  level: LogLevel
  category: string
  message: string
}

const MAX = 2000
let counter = 0
const buffer: LogEntry[] = []

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOG_DIR, 'infinix.log')
let fileLoggingReady = false
try {
  mkdirSync(LOG_DIR, { recursive: true })
  fileLoggingReady = true
} catch { /* ignore if directory cannot be created */ }

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m'
}
const RESET = '\x1b[0m'

function write(level: LogLevel, category: string, message: string) {
  const entry: LogEntry = { id: ++counter, ts: new Date().toISOString(), level, category, message }
  buffer.push(entry)
  if (buffer.length > MAX) buffer.shift()
  const color = COLORS[level]
  const line = `${color}[${entry.ts}] [${level.toUpperCase().padEnd(5)}] [${category}]${RESET} ${message}`
  if (level === 'error') {
    console.error(line)
    Sentry.captureMessage(message, { level: 'error', tags: { category } })
  } else {
    console.log(line)
  }
  if (fileLoggingReady) {
    try {
      appendFileSync(LOG_FILE, `[${entry.ts}] [${level.toUpperCase().padEnd(5)}] [${category}] ${message}\n`)
    } catch { /* ignore file errors */ }
  }
}

export const logger = {
  debug: (cat: string, msg: string) => write('debug', cat, msg),
  info:  (cat: string, msg: string) => write('info',  cat, msg),
  warn:  (cat: string, msg: string) => write('warn',  cat, msg),
  error: (cat: string, msg: string) => write('error', cat, msg),
}

export function getLogs(limit = 500, sinceId?: number): LogEntry[] {
  const entries = sinceId != null ? buffer.filter(e => e.id > sinceId) : buffer
  return entries.slice(-limit)
}

export function clearLogs() {
  buffer.length = 0
}
