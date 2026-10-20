import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

export const randomToken = () => randomBytes(32).toString('base64url')
export const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function seal(value: string, key: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')
}
export function unseal(value: string, key: string) {
  const bytes = Buffer.from(value, 'base64url')
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), bytes.subarray(0, 12))
  cipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8')
}
