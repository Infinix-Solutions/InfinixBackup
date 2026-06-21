import { generateKeyPairSync, randomBytes } from 'node:crypto'

function sshBuf(s: string | Buffer): Buffer {
  const b = typeof s === 'string' ? Buffer.from(s, 'utf8') : s
  const len = Buffer.alloc(4)
  len.writeUInt32BE(b.length)
  return Buffer.concat([len, b])
}

export function generateSshKeyPair(comment = 'infinix-backup'): { privateKey: string; publicKey: string } {
  const { privateKey: privObj } = generateKeyPairSync('ed25519')

  const jwkPriv = privObj.export({ format: 'jwk' }) as { d: string; x: string }
  const seed = Buffer.from(jwkPriv.d, 'base64url')
  const pubBytes = Buffer.from(jwkPriv.x, 'base64url')

  const privKeyFull = Buffer.concat([seed, pubBytes])

  const keyType = 'ssh-ed25519'
  const pubKeyBlob = Buffer.concat([sshBuf(keyType), sshBuf(pubBytes)])
  const publicKey = `${keyType} ${pubKeyBlob.toString('base64')} ${comment}`

  const checkInt = randomBytes(4)
  let privSection = Buffer.concat([
    checkInt, checkInt,
    sshBuf(keyType),
    sshBuf(pubBytes),
    sshBuf(privKeyFull),
    sshBuf(comment)
  ])
  const padLen = (8 - (privSection.length % 8)) % 8
  privSection = Buffer.concat([privSection, Buffer.from(Array.from({ length: padLen }, (_, i) => i + 1))])

  const body = Buffer.concat([
    Buffer.from('openssh-key-v1\0'),
    sshBuf('none'),
    sshBuf('none'),
    sshBuf(Buffer.alloc(0)),
    Buffer.from([0, 0, 0, 1]),
    sshBuf(pubKeyBlob),
    sshBuf(privSection)
  ])

  const b64Lines = body.toString('base64').match(/.{1,70}/g) || []
  const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${b64Lines.join('\n')}\n-----END OPENSSH PRIVATE KEY-----\n`

  return { privateKey, publicKey }
}
