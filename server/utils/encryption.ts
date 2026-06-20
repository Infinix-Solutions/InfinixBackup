import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const MARKER = '_e'

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || (useRuntimeConfig().encryptionKey as string)
  return createHash('sha256').update(secret).digest()
}

export function encryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  const key = deriveKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plaintext = JSON.stringify(config)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`
  return { [MARKER]: payload }
}

export function decryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  if (!(MARKER in config)) return config
  const key = deriveKey()
  const parts = (config[MARKER] as string).split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted config format')
  const [ivHex, tagHex, ctHex] = parts as [string, string, string]
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()])
  return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>
}
