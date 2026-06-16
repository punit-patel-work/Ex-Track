import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/10 border border-violet-500/20">
          <FileQuestion className="h-10 w-10 text-violet-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            404
          </h1>
          <p className="text-lg font-bold text-zinc-300">Page not found</p>
          <p className="text-sm text-zinc-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 px-6 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-2xl border border-zinc-800 py-3 px-6 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
