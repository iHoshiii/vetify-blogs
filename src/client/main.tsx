import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Feed } from './feed.js'
import { Detail } from './detail.js'
import { Author } from './author.js'
import { Admin } from './admin.js'
import { api, loginUrl, useResource } from './api.js'
import type { Principal } from '../shared/types.js'
import './styles.css'

function Callback() {
  useEffect(() => {
    window.location.replace(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/callback${window.location.search}`)
  }, [])
  return <main className="state" role="status">Completing main Vetify sign-in...</main>
}
function App() {
  const location = useLocation()
  const session = useResource<Principal>('/auth/me')
  const [logoutError, setLogoutError] = useState('')
  useEffect(() => { window.scrollTo(0, 0); document.title = 'Vetify Journal' }, [location.pathname])
  async function logout() {
    try { await api('/auth/logout', { method: 'POST', body: '{}' }); window.location.assign('/blogs') }
    catch (e) { setLogoutError((e as Error).message) }
  }
  return <><header className="site-header"><Link className="brand" to="/blogs"><span className="brand-icon">✳</span>vetify<span className="brand-period">.</span></Link>
    <Link className="journal-label" to="/blogs">THE JOURNAL</Link><nav aria-label="Main navigation">
      <Link className={location.pathname.startsWith('/blogs') ? 'active' : ''} to="/blogs">Articles</Link>
      <Link to="/write">Author desk <span>↗</span></Link>
      {session.data?.role === 'admin' && <Link to="/admin">Moderation</Link>}
      {session.data ? <button onClick={() => void logout()}>Sign out of Blog</button> : <a className="sign-in" href={loginUrl}>Sign in ↗</a>}
    </nav></header>
    {logoutError && <p className="notice error" role="alert">{logoutError}</p>}
    <Routes><Route path="/" element={<Navigate to="/blogs" replace />} /><Route path="/blogs" element={<Feed />} />
      <Route path="/blogs/:slug" element={<Detail />} /><Route path="/write" element={<Author />} />
      <Route path="/write/:id" element={<Author />} /><Route path="/admin" element={<Admin />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route path="*" element={<main className="state"><h1>Page not found.</h1><Link to="/blogs">Visit the journal</Link></main>} /></Routes>
    <footer><Link className="brand" to="/blogs">vetify.</Link><p>Better care starts with understanding.</p><span>THE JOURNAL · VETERINARY EDUCATION</span></footer></>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>)
