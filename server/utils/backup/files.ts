import { spawn } from 'child_process'
import { Readable } from 'stream'
import { existsSync } from 'fs'
import { sshExec, sshExecString, shEscape } from '../ssh/exec'
import type { FilesConfig, CompressionType, SshConnectionConfig } from '../types'

export function createFilesBackup(config: FilesConfig, compression: CompressionType, ssh?: SshConnectionConfig): Readable {
  const path = config.path
  const parentDir = path.includes('/') ? (path.substring(0, path.lastIndexOf('/')) || '/') : '/'
  const name = (path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path) || '.'

  if (ssh) {
    const gzip = compression === 'gzip' ? '--gzip' : ''
    const cmd = [`tar --create`, gzip, `--file=- --directory=${shEscape(parentDir)} ${shEscape(name)}`]
      .filter(Boolean).join(' ')
    return sshExec(cmd, ssh)
  }

  if (!existsSync(path)) {
    throw new Error(`Path does not exist: ${path}`)
  }

  const tarArgs: string[] = ['--create']
  if (compression === 'gzip' || compression === 'zip') tarArgs.push('--gzip')
  tarArgs.push('--file=-', `--directory=${parentDir}`, name)

  const proc = spawn('tar', tarArgs)
  proc.stderr.on('data', (data: Buffer) => console.error('[tar stderr]', data.toString()))
  proc.on('error', (err) => console.error('[tar error]', err))
  proc.on('close', (code) => { if (code !== 0) console.error(`[tar] exited with code ${code}`) })

  return proc.stdout
}

export async function testFilesPath(config: FilesConfig, ssh?: SshConnectionConfig): Promise<void> {
  if (ssh) {
    const out = await sshExecString(`test -e ${shEscape(config.path)} && echo ok || echo fail`, ssh)
    if (!out.includes('ok')) throw new Error(`Remote path does not exist: ${config.path}`)
    return
  }
  if (!existsSync(config.path)) throw new Error(`Path does not exist: ${config.path}`)
}
