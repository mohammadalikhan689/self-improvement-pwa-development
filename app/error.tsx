'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[v0] Unhandled application error:', error)
  }, [error])

  const stack = error.stack?.split('\n').slice(0, 5).join('\n')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1>This page couldn&apos;t load</h1>
      <p className="max-w-lg text-sm text-muted-foreground">{error.message || 'An unexpected error occurred.'}</p>
      <pre className="max-w-2xl overflow-auto whitespace-pre-wrap text-left text-[11px] leading-4 text-muted-foreground">
        {`Name: ${error.name || 'Error'}\nMessage: ${error.message || 'Unknown error'}${stack ? `\nStack:\n${stack}` : ''}`}
      </pre>
      <div className="flex gap-3">
        <button className="primary-button" onClick={() => reset()}>Reload</button>
        <button className="secondary-button" onClick={() => window.history.back()}>Back</button>
      </div>
    </main>
  )
}
