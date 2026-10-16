import { useCallback, useEffect, useState } from 'react'

const base = import.meta.env.VITE_API_URL ?? '/api/v1'
if (!base.startsWith('/') || base.startsWith('//')) throw new Error('VITE_API_URL must be a same-origin API path')
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, { credentials: 'include', cache: 'no-store',
    ...init, headers: { 'content-type': 'application/json', ...init.headers } })
  let body: { data: T; error?: string; issues?: string[] }
  try { body = await response.json() }
  catch { throw new ApiError(response.status, 'Blog service returned an invalid response. Please retry.') }
  if (!response.ok) throw new ApiError(response.status, body.issues?.join('. ') || body.error || 'Request failed')
  return body.data
}
export const loginUrl = `${base}/auth/login`
export function useResource<T>(path: string) {
  const [state, setState] = useState<{ path: string; data?: T; error?: Error; loading: boolean }>({ path, loading: true })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setState({ path, loading: true })
    api<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, data, loading: false })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ path, error, loading: false })
    })
    return () => controller.abort()
  }, [path, version])
  return { ...(state.path === path ? state : { path, data: undefined, error: undefined, loading: true }), reload }
}
