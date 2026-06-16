'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useDashboard } from '@/contexts/dashboard-context'
import { Save, Keyboard, Shield, User, Globe, Moon, Sun, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  
  const { currency, setCurrency } = useDashboard()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ex_track_theme') as 'light' | 'dark') || 'dark'
    }
    return 'dark'
  })
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('ex_track_full_name')
    if (savedName) {
      setFullName(savedName)
    } else if (user) {
      setFullName(user.user_metadata?.full_name || 'Guest User')
    }
    if (user) {
      setEmail(user.email || 'guest@ex-track.com')
    }
  }, [user])

  // Simple Theme Switcher
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // Persist to localStorage
    localStorage.setItem('ex_track_theme', theme)
    // currency is already persisted in setCurrency in the context
    localStorage.setItem('ex_track_full_name', fullName)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const shortcutItems = [
    { key: 'N', desc: 'Open New Transaction Quick-Add Numpad' },
    { key: 'S / /', desc: 'Focus fuzzy transaction search in Ledger' },
    { key: 'Esc', desc: 'Close open dialogs or overlays' },
  ]

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your currency settings, credentials, and app preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Card */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">Profile Configuration</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Update your base information and currency preferences.</p>
              </div>
            </div>

            {isSaved && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                Settings saved successfully!
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Base Currency</label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Theme Preference</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10 border-transparent'
                        : 'bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                    }`}
                  >
                    <Sun size={15} />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10 border-transparent'
                        : 'bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                    }`}
                  >
                    <Moon size={15} />
                    Dark
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 px-6 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/10 cursor-pointer transition"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Info Cards / Keyboard Shortcuts */}
        <div className="space-y-6">
          {/* Shortcuts Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <Keyboard size={16} className="text-violet-500" />
              <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Keyboard Shortcuts</h4>
            </div>
            <div className="space-y-3.5">
              {shortcutItems.map(item => (
                <div key={item.key} className="flex gap-3 items-start">
                  <kbd className="inline-flex h-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 shadow-sm min-w-8">
                    {item.key}
                  </kbd>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security & RLS Card */}
          <div className="bg-gradient-to-tr from-violet-950/20 to-indigo-950/10 border border-violet-900/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-violet-900/20">
              <Shield size={16} className="text-violet-400" />
              <h4 className="font-bold text-violet-400 text-sm">Security Policy Active</h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every database table enforces strict Row-Level Security (RLS) policies. Only you have decryption authorization and read/write permissions for your account tokens and ledger values.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
