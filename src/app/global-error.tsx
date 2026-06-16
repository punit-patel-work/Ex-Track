'use client'

import { RefreshCw, AlertTriangle, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-zinc-950 text-white font-sans">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black">Something went wrong</h1>
              <p className="text-sm text-zinc-400">
                An unexpected error occurred. This has been logged automatically.
              </p>
              {error.digest && (
                <p className="text-xs text-zinc-600 font-mono">Error ID: {error.digest}</p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 px-6 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 cursor-pointer transition"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-2xl border border-zinc-800 py-3 px-6 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
