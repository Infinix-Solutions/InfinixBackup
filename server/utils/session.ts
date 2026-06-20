import type { H3Event } from 'h3'

export interface AuthSessionData {
  userId: string
  username: string
  role: 'admin' | 'viewer'
}

export function getAuthSession(event: H3Event) {
  return useSession<AuthSessionData>(event, {
    password: process.env.SESSION_SECRET || (useRuntimeConfig().sessionSecret as string),
    name: 'backup_session',
    maxAge: 60 * 60 * 24 * 7
  })
}
