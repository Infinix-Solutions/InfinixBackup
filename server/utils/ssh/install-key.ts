import { createConnection } from 'net'
import { Client } from 'ssh2'
import { logger } from '../logger'

const CAT = 'ssh:install'

function testTcp(host: string, port: number, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host, port })
    const t = setTimeout(() => { sock.destroy(); reject(new Error(`TCP timeout — ${host}:${port} not reachable in ${timeoutMs / 1000}s`)) }, timeoutMs)
    sock.on('connect', () => { clearTimeout(t); sock.destroy(); resolve() })
    sock.on('error', (e) => { clearTimeout(t); reject(new Error(`TCP error — ${e.message}`)) })
  })
}

export async function installPublicKey(
  config: { host: string; port: number; username: string; password: string },
  publicKey: string
): Promise<void> {
  logger.info(CAT, `Starting key installation → ${config.username}@${config.host}:${config.port}`)

  logger.debug(CAT, `TCP pre-check ${config.host}:${config.port}`)
  try {
    await testTcp(config.host, config.port, 5000)
    logger.info(CAT, `TCP OK — port ${config.port} is open`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error(CAT, `TCP failed: ${msg}`)
    throw new Error(msg)
  }

  return new Promise((resolve, reject) => {
    const conn = new Client()
    let authMethod = 'unknown'

    const timer = setTimeout(() => {
      logger.error(CAT, `SSH handshake timeout (12s) — server may have dropped the connection`)
      conn.end()
      reject(new Error(`SSH connection timed out after 12s — server may reject password auth`))
    }, 12000)

    conn.on('ready', () => {
      clearTimeout(timer)
      logger.info(CAT, `SSH authenticated via ${authMethod} — running key install commands`)

      const cmd = [
        'mkdir -p ~/.ssh',
        'chmod 700 ~/.ssh',
        `echo ${JSON.stringify(publicKey)} >> ~/.ssh/authorized_keys`,
        'chmod 600 ~/.ssh/authorized_keys',
        'sort -u -o ~/.ssh/authorized_keys ~/.ssh/authorized_keys'
      ].join(' && ')

      conn.exec(cmd, (err, channel) => {
        if (err) {
          logger.error(CAT, `exec failed: ${err.message}`)
          conn.end()
          return reject(err)
        }
        let stderr = ''
        let exitCode: number | null = null
        channel.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
        channel.on('exit', (code: number | null) => { exitCode = code })
        channel.resume()
        channel.on('close', () => {
          conn.end()
          if (exitCode !== 0) {
            logger.error(CAT, `Key install command exited ${exitCode}: ${stderr}`)
            reject(new Error(`Key installation failed (exit ${exitCode}): ${stderr.trim() || 'unknown error'}`))
          } else {
            logger.info(CAT, `Public key successfully installed to ~/.ssh/authorized_keys`)
            resolve()
          }
        })
        channel.on('error', (e: Error) => { conn.end(); reject(e) })
      })
    })

    conn.on('error', (err) => {
      clearTimeout(timer)
      const msg = err.message || String(err)
      logger.error(CAT, `SSH error: ${msg}`)

      if (msg.includes('Authentication failed') || msg.includes('All configured authentication methods failed')) {
        reject(new Error(`Authentication failed — check password, or ensure PasswordAuthentication/KbdInteractiveAuthentication is enabled in /etc/ssh/sshd_config on the server`))
      } else if (msg.includes('ECONNREFUSED')) {
        reject(new Error(`Connection refused — no SSH service on ${config.host}:${config.port}`))
      } else {
        reject(err)
      }
    })

    conn.on('keyboard-interactive', (_name, _inst, _lang, prompts, finish) => {
      authMethod = 'keyboard-interactive'
      logger.debug(CAT, `keyboard-interactive prompt received (${prompts.length} prompts)`)
      finish(prompts.map(() => config.password))
    })

    logger.debug(CAT, `Initiating SSH connection (password + keyboard-interactive)`)
    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      tryKeyboard: true,
      readyTimeout: 10000,
      algorithms: {
        serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
      },
      debug: (msg: string) => logger.debug(CAT, `[ssh2] ${msg}`)
    })
  })
}
