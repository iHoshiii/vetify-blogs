import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import { isIP } from 'node:net'
import { BlockList } from 'node:net'
import { safeHttps } from '../../shared/schemas.js'

const blocked = new BlockList()
const blockedV6 = new BlockList()
for (const [ip, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(ip, prefix, 'ipv4')
for (const [ip, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10],
  ['ff00::', 8], ['2001:db8::', 32], ['::ffff:0:0', 96], ['64:ff9b::', 96],
  ['2002::', 16], ['::', 96]] as const) blockedV6.addSubnet(ip, prefix, 'ipv6')
export const isPublicAddress = (ip: string) => isIP(ip) === 4 ? !blocked.check(ip, 'ipv4') :
  isIP(ip) === 6 && !blockedV6.check(ip, 'ipv6')
export function imageMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}
export async function fetchCoverImage(raw: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    let target = new URL(raw)
    for (let hop = 0; hop < 2; hop++) {
      if (!safeHttps(target.href) || (target.port && target.port !== '443')) return null
      const hostname = target.hostname.replace(/^\[|\]$/g, '')
      const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] :
        await lookup(hostname, { all: true })
      if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) return null
      const pinned = addresses[0]
      const result = await new Promise<{ redirect?: string; bytes?: Buffer }>((resolve, reject) => {
        const req = request(target, { method: 'GET', signal: AbortSignal.timeout(5000),
          headers: { accept: 'image/png,image/jpeg,image/webp' },
          lookup: (_host, options, callback) => {
            if (options.all) callback(null, [pinned])
            else callback(null, pinned.address, pinned.family)
          },
        }, res => {
          const status = res.statusCode ?? 0
          if (status >= 300 && status < 400) {
            res.resume(); resolve({ redirect: res.headers.location }); return
          }
          if (status !== 200 || Number(res.headers['content-length']) > 5 * 1024 * 1024) {
            res.destroy(); resolve({}); return
          }
          const chunks: Buffer[] = []
          let size = 0
          res.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size > 5 * 1024 * 1024) { res.destroy(); resolve({}) }
            else chunks.push(chunk)
          })
          res.on('end', () => resolve({ bytes: Buffer.concat(chunks) }))
          res.on('error', reject)
        })
        req.on('error', reject)
        req.end()
      })
      if (result.redirect && hop === 0) { target = new URL(result.redirect, target); continue }
      const mimeType = result.bytes && imageMime(result.bytes)
      return mimeType && result.bytes ? { mimeType, data: result.bytes.toString('base64') } : null
    }
  } catch { return null }
  return null
}
