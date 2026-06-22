import * as Sentry from '@sentry/node'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  ts: string
  level: LogLevel
  category: string
  message: string
}

const MAX_FILE_LINES = 10000
let counter = 0
let lineCount = 0

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOG_DIR, 'infinix.log')
let fileLoggingReady = false

try {
  mkdirSync(LOG_DIR, { recursive: true })
  if (existsSync(LOG_FILE)) {
    const content = readFileSync(LOG_FILE, 'utf8')
    const lines = content.trim().split('\n').filter(Boolean)
    lineCount = lines.length
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]!)
        if (typeof entry.id === 'number') {
          counter = entry.id
          break
        }
      } catch { /* skip malformed */ }
    }
  }
  fileLoggingReady = true
} catch { /* directory creation failed */ }

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m'
}
const RESET = '\x1b[0m'

function trimFile() {
  try {
    const content = readFileSync(LOG_FILE, 'utf8')
    const lines = content.trim().split('\n').filter(Boolean)
    const trimmed = lines.slice(-MAX_FILE_LINES)
    writeFileSync(LOG_FILE, trimmed.join('\n') + '\n')
    lineCount = trimmed.length
  } catch { /* ignore */ }
}

function write(level: LogLevel, category: string, message: string) {
  const entry: LogEntry = { id: ++counter, ts: new Date().toISOString(), level, category, message }
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
      appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
      lineCount++
      if (lineCount > MAX_FILE_LINES + 1000) trimFile()
    } catch { /* ignore file errors */ }
  }
}

export const logger = {
  debug: (cat: string, msg: string) => write('debug', cat, msg),
  info: (cat: string, msg: string) => write('info', cat, msg),
  warn: (cat: string, msg: string) => write('warn', cat, msg),
  error: (cat: string, msg: string) => write('error', cat, msg)
}

export function getLogs(limit = 500, sinceId?: number): LogEntry[] {
  if (!fileLoggingReady) return []
  try {
    const content = readFileSync(LOG_FILE, 'utf8')
    const lines = content.trim().split('\n').filter(Boolean)
    const entries: LogEntry[] = []
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line))
      } catch { /* skip malformed line */ }
    }
    const filtered = sinceId != null ? entries.filter(e => e.id > sinceId) : entries
    return filtered.slice(-limit)
  } catch {
    return []
  }
}

export function clearLogs() {
  counter = 0
  lineCount = 0
  if (fileLoggingReady) {
    try {
      writeFileSync(LOG_FILE, '')
    } catch { /* ignore */ }
  }
}
