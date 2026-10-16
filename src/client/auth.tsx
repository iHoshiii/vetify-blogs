import type { ReactNode } from 'react'
import type { Principal } from '../shared/types.js'
import { ApiError, loginUrl, useResource } from './api.js'
import { ErrorState, Loading } from './components.js'

export function AuthGate({ admin = false, children }: { admin?: boolean; children: (p: Principal) => ReactNode }) {
  const session = useResource<Principal>('/auth/me')
  if (session.loading) return <main><Loading /></main>
  if (session.error) return <main><div className="state">
    <h1>{session.error instanceof ApiError && session.error.status === 401 ? 'Sign in to continue.' : 'Sign-in is unavailable.'}</h1>
    <p>{session.error.message}</p><p>Your account and professional verification are managed by main Vetify.</p>
    <a className="button" href={loginUrl}>Continue with Vetify</a><button onClick={session.reload}>Retry</button>
  </div></main>
  if (!session.data || (admin ? session.data.role !== 'admin' : !['professional', 'admin'].includes(session.data.role))) {
    return <main><ErrorState error={new Error(admin ? 'Only current administrators can moderate articles.' : 'Authoring requires a professional or administrator account.')} /></main>
  }
  return <>{children(session.data)}</>
}
