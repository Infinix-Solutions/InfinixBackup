import { Client } from 'ssh2'
import { PassThrough } from 'stream'
import type { Readable } from 'stream'
import { logger } from '../logger'

export interface SshConfig {
  host: string
  port: number
  username: string
  privateKey: string
}

export function sshExec(command: string, config: SshConfig): Readable {
  const pass = new PassThrough()
  const conn = new Client()
  const tag = `${config.username}@${config.host}:${config.port}`

  conn.on('ready', () => {
    logger.debug('ssh:exec', `Connected ${tag} — running: ${command.slice(0, 120)}`)
    conn.exec(command, (err, channel) => {
      if (err) {
        logger.error('ssh:exec', `exec error on ${tag}: ${err.message}`)
        conn.end()
        pass.destroy(err)
        return
      }
      channel.on('data', (data: Buffer) => pass.push(data))
      channel.stderr.on('data', (data: Buffer) => {
        logger.warn('ssh:exec', `[stderr] ${data.toString().trim()}`)
      })
      channel.on('close', (code: number) => {
        conn.end()
        if (code !== 0) {
          logger.error('ssh:exec', `Command exited with code ${code} on ${tag}`)
          pass.destroy(new Error(`Remote command exited with code ${code}`))
        } else {
          pass.push(null)
        }
      })
      channel.on('error', (err: Error) => {
        conn.end()
        pass.destroy(err)
      })
    })
  })

  conn.on('error', (err) => {
    logger.error('ssh:exec', `Connection error on ${tag}: ${err.message}`)
    pass.destroy(err)
  })

  conn.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    privateKey: config.privateKey,
    readyTimeout: 15000,
    algorithms: {
      serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
    }
  })

  return pass
}

export function sshExecString(command: string, config: SshConfig): Promise<string> {
  const tag = `${config.username}@${config.host}:${config.port}`
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let output = ''

    conn.on('ready', () => {
      logger.debug('ssh:exec', `Connected ${tag} — running: ${command.slice(0, 120)}`)
      conn.exec(command, (err, channel) => {
        if (err) {
          conn.end()
          return reject(err)
        }
        channel.on('data', (d: Buffer) => {
          output += d.toString()
        })
        channel.stderr.on('data', (d: Buffer) => {
          logger.debug('ssh:exec', `[stderr] ${d.toString().trim()}`)
        })
        channel.on('close', (code: number) => {
          conn.end()
          if (code !== 0 && !output) reject(new Error(`Command failed with code ${code}`))
          else resolve(output)
        })
        channel.on('error', (e: Error) => {
          conn.end()
          reject(e)
        })
      })
    })

    conn.on('error', (err) => {
      logger.error('ssh:exec', `Connection error on ${tag}: ${err.message}`)
      reject(err)
    })

    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      privateKey: config.privateKey,
      readyTimeout: 15000
    })
  })
}

export function shEscape(s: string): string {
  return `'${s.replace(/'/g, '\'\\\'\'')}'`
}
