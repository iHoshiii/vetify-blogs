import { afterEach, describe, it, expect, vi } from 'vitest'
import { scanText } from '../src/server/moderation/wordlist.js'
import { createScreen } from '../src/server/moderation/screen.js'
import { imageMime, isPublicAddress, fetchCoverImage } from '../src/server/moderation/image.js'
import { parseConfig } from '../src/server/config.js'
import { slugify } from '../src/server/data/slug.js'

const generate = vi.hoisted(() => vi.fn())
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: generate } },
  Type: { OBJECT: 'OBJECT', BOOLEAN: 'BOOLEAN', ARRAY: 'ARRAY', STRING: 'STRING', NUMBER: 'NUMBER' } }))
const config = parseConfig({ MONGODB_URI: 'mongodb://localhost/blog_test', GEMINI_API_KEY: 'test-only' })
const input = { title: 'Cat care', excerpt: 'Care for cats', body: 'Clinical anatomy and surgery are educational.', tags: [], coverUrl: null }
afterEach(() => vi.resetAllMocks())
describe('source wordlist and slugs', () => {
  it('preserves clinical language, word boundaries, substitutions and severity', () => {
    expect(scanText('Suspicious lumps and animal surgery.').severity).toBe(0)
    expect(scanText('p0rn').severity).toBeGreaterThan(0)
    expect(scanText('pooorn').severity).toBeGreaterThan(0)
    expect(scanText('buy xanax').categories).toContain('illegal')
    const hit = scanText('nsfw: bestiality')
    expect(hit.terms[0]).toBe('bestiality')
    expect(hit.terms).toHaveLength(2)
    expect(hit.severity).toBe(.99)
  })
  it('preserves stable bounded ASCII slugs', () => {
    expect(slugify('Café: Healthy Cats!')).toBe('cafe-healthy-cats')
    expect(slugify('猫')).toBe('post')
    expect(slugify('cat '.repeat(100)).length).toBeLessThanOrEqual(80)
  })
})
describe('provider failures and validated answers', () => {
  it('never treats missing configuration or malformed responses as a clean pass', async () => {
    expect((await createScreen({ ...config, GEMINI_API_KEY: '' })(input)).outcome).toBe('unavailable')
    for (const text of ['{}', '{', JSON.stringify({ flagged: false, categories: ['hate'], severity: 0, notes: 'inconsistent' })]) {
      generate.mockResolvedValueOnce({ text })
      expect((await createScreen(config)(input)).outcome).toBe('unavailable')
    }
    generate.mockRejectedValueOnce(new Error('Provider timeout'))
    expect((await createScreen(config)(input)).outcome).toBe('unavailable')
  })
  it('preserves provider clean/flagged decisions and checks the wordlist first', async () => {
    generate.mockResolvedValueOnce({ text: JSON.stringify({ flagged: false, categories: [], severity: 0, notes: 'Educational' }) })
    expect((await createScreen(config)(input)).outcome).toBe('clean')
    generate.mockResolvedValueOnce({ text: JSON.stringify({ flagged: true, categories: ['hate'], severity: .9, notes: 'Review content' }) })
    expect((await createScreen(config)(input)).outcome).toBe('flagged')
    expect((await createScreen(config)({ ...input, body: 'buy xanax' })).outcome).toBe('flagged')
    expect(generate).toHaveBeenCalledTimes(2)
  })
  it('holds unreadable covers and rejects unsafe fetch destinations and active image formats', async () => {
    for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1']) {
      expect(isPublicAddress(ip)).toBe(false)
    }
    expect(isPublicAddress('8.8.8.8')).toBe(true)
    for (const url of ['http://example.com/a.png', 'https://127.0.0.1/a.png', 'https://[::1]/a.png', 'https://user:pass@example.com/a.png']) {
      expect(await fetchCoverImage(url)).toBeNull()
    }
    expect(imageMime(Buffer.from('<svg onload="alert(1)">'))).toBeNull()
    expect((await createScreen(config)({ ...input, coverUrl: 'https://127.0.0.1/a.png' })).outcome).toBe('unavailable')
    expect(generate).not.toHaveBeenCalled()
  })
})
