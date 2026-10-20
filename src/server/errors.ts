import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Invalid input', issues: error.issues.map(i => i.message) })
  } else if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message })
  } else if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request is too large' })
  } else if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON' })
  } else {
    console.error('Blog request failed', error instanceof Error ? error.name : 'UnknownError')
    res.status(503).json({ error: 'Blog service unavailable. Please retry.' })
  }
}
