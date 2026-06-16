'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { ArrowRight, Lock, Mail, User as UserIcon, Loader2, Sparkles } from 'lucide-react'

export default function SignupPage() {
  const { signUp, loginAsGuest, isMock } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password) return
    setLoading(true)
    setError(null)

    const res = await signUp(email, password, fullName)
    if (res.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  const handleGuestSignUp = async () => {
    setLoading(true)
    setError(null)
    try {
      await loginAsGuest()
    } catch (err: any) {
      setError(err.message || 'Failed to login as guest')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Join Ex-Track and start mastering your cash flow today.
          </p>
        </div>

        <div className="glass bg-white/[0.03] border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900/60 border border-zinc-800 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition duration-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-5 w-5 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900/60 border border-zinc-800 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition duration-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-5 w-5 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900/60 border border-zinc-800 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition duration-200 disabled:opacity-75 shadow-lg shadow-violet-500/15 group"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 w-full border-t border-zinc-800" />
            <span className="relative bg-[#0b0f19] px-3 text-xs uppercase text-zinc-500">Or continue with</span>
          </div>

          <button
            onClick={handleGuestSignUp}
            disabled={loading}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 py-3 text-sm font-semibold hover:bg-zinc-800/40 text-zinc-200 hover:text-white transition duration-200 flex items-center justify-center gap-2"
          >
            Explore as Guest (Offline Mode)
          </button>
        </div>

        <p className="text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300 hover:underline transition duration-200">
            Sign In
          </Link>
        </p>

        {isMock && (
          <div className="text-center p-4 rounded-2xl bg-violet-950/20 border border-violet-900/30">
            <span className="text-xs font-semibold text-violet-400 block mb-1 uppercase tracking-wider">Demo / Sandbox Mode</span>
            <p className="text-xs text-zinc-400">
              Supabase credentials not configured. Signing up as guest runs offline.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
