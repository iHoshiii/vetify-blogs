import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Blog } from '../shared/types.js'
import { api } from './api.js'
import { BlogBody } from './components.js'

export function EditorForm({ post, onSave }: { post?: Blog; onSave: () => void }) {
  const navigate = useNavigate()
  const [body, setBody] = useState(post?.body ?? '')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const moderated = post && ['flagged', 'hidden', 'removed'].includes(post.status)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const status = String(form.get('status'))
    const payload = { title: form.get('title'), excerpt: form.get('excerpt'), body,
      coverUrl: String(form.get('coverUrl') ?? '').trim() || null,
      tags: String(form.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean),
      ...(!moderated ? { status } : {}) }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await api<Blog>(post ? `/blogs/${post.id}` : '/blogs', {
        method: post ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      })
      setNotice(result.status === 'flagged' ? 'Saved privately for moderation. An administrator must review or retry the check.' :
        result.status === 'published' ? 'Article published.' : 'Changes saved privately.')
      onSave()
      if (!post) navigate(`/write/${result.id}`, { replace: true })
    } catch (error) { setError((error as Error).message) }
    finally { setBusy(false) }
  }
  return <form className="editor" onSubmit={submit}>
    <div className="section-heading"><div><p className="eyebrow">AUTHOR DESK</p>
      <h1>{post ? 'Edit your article.' : 'Make a little knowledge go further.'}</h1></div>
      {post && <span className={`status ${post.status}`}>{post.status}</span>}</div>
    {moderated && <p className="notice">This post is under moderation. Only administrators can revise its text, and publication requires a moderation decision.</p>}
    <fieldset disabled={busy}>
      <label>Title<input name="title" required minLength={3} maxLength={160} defaultValue={post?.title} /></label>
      <label>Short introduction<textarea name="excerpt" rows={3} required minLength={10} maxLength={320} defaultValue={post?.excerpt} /></label>
      <label>Cover image URL<input name="coverUrl" type="url" pattern="https://.*" maxLength={2048} placeholder="https://..." defaultValue={post?.coverUrl ?? ''} /></label>
      <p className="muted">Use an image you may publish. External image URLs are accessible to anyone who has the URL.</p>
      <label>Tags, separated by commas<input name="tags" placeholder="dogs, everyday care" defaultValue={post?.tags.join(', ')} /></label>
      <div className="editor-tabs"><label htmlFor="body">Article in Markdown</label>
        <button type="button" onClick={() => setPreview(v => !v)}>{preview ? 'Continue writing' : 'Preview'}</button></div>
      <textarea id="body" hidden={preview} rows={18} required minLength={50} maxLength={200000} value={body} onChange={e => setBody(e.target.value)} />
      {preview && <div className="preview"><BlogBody>{body}</BlogBody></div>}
      {!moderated && <label>Save as<select name="status" defaultValue={post?.status ?? 'draft'}>
        <option value="draft">Private draft</option><option value="published">Submit for publication</option></select></label>}
      <button className="primary" type="submit">{busy ? 'Saving and checking...' : 'Save article'}</button>
    </fieldset>
    {error && <p className="notice error" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
  </form>
}
