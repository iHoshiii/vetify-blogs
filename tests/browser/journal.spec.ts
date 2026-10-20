import { test, expect } from '@playwright/test'

const posts = Array.from({ length: 10 }, (_, index) => ({
  id: String(index), title: index === 0 ? 'Everyday care for older cats' : `Practical notes on animal care ${index}`,
  slug: `animal-care-${index}`, excerpt: 'Small changes, thoughtful routines, and useful questions for your next veterinary visit.',
  tags: ['everyday care', 'cats'], coverUrl: null, status: 'published', authorId: '111111111111111111111111',
  publishedAt: '2026-10-14T00:00:00.000Z', createdAt: '2026-10-14T00:00:00.000Z', updatedAt: '2026-10-14T00:00:00.000Z',
}))
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/auth/me') return route.fulfill({ status: 503, json: { error: 'Main web sign-in is awaiting integration.' } })
    if (url.pathname.startsWith('/api/v1/blogs/')) {
      const post = posts.find(p => url.pathname.endsWith(p.slug))
      return route.fulfill(post ? { json: { data: { ...post,
        body: '## A few changes to notice\n\nKeep a simple record of daily habits and discuss changes with your veterinarian.\n\n<script>window.injected=true</script>\n\n[unsafe](javascript:alert%281%29)' } } } :
        { status: 404, json: { error: 'Post not found' } })
    }
    const pageNumber = Number(url.searchParams.get('page') ?? 1)
    return route.fulfill({ json: { data: { items: posts.slice((pageNumber - 1) * 9, pageNumber * 9),
      total: 10, page: pageNumber, pages: 2, limit: 9 } } })
  })
})
test('desktop feed, pagination, safe detail and unavailable authoring', async ({ page }) => {
  await page.goto('/blogs')
  await expect(page.getByRole('heading', { name: 'Practical pet care notes.' })).toBeVisible()
  await expect(page.locator('.article-card')).toHaveCount(9)
  await page.screenshot({ path: 'test-results/journal-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.locator('.article-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  await page.getByRole('heading', { name: posts[0].title }).getByRole('link').click()
  await expect(page.getByRole('heading', { name: 'A few changes to notice' })).toBeVisible()
  await expect(page.locator('.prose script')).toHaveCount(0)
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Author desk' }).click()
  await expect(page.getByRole('heading', { name: 'Sign-in is unavailable.' })).toBeVisible()
})
test('mobile layout remains within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blogs')
  await expect(page.locator('.article-card')).toHaveCount(9)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/journal-mobile.png', fullPage: true })
})
test('feed exposes loading, retry and empty states', async ({ page }) => {
  await page.route('**/api/v1/blogs?*', route => route.fulfill({ status: 503, json: { error: 'Temporary outage' } }))
  await page.goto('/blogs')
  await expect(page.getByRole('alert')).toContainText('Temporary outage')
  await page.route('**/api/v1/blogs?*', route => route.fulfill({ json: { data: { items: [], total: 0, page: 1, pages: 0, limit: 9 } } }))
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'The journal is taking shape.' })).toBeVisible()
})
