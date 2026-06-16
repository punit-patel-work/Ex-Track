'use client'

import { RefreshCw, AlertTriangle, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-[70vh] items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Something went wrong</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            We couldn&apos;t load this section. Try refreshing or head back to the dashboard.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 px-6 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 cursor-pointer transition"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-3 px-6 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
