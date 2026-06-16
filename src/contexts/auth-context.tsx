'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isMock: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  loginAsGuest: () => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to determine if we are in mock mode
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && !url.includes('[') && !key.includes('[')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const forceMock = localStorage.getItem('ex_track_force_mock') === 'true'
    if (forceMock || !isSupabaseConfigured()) {
      // Configure Local Mock Session
      const cachedUser = localStorage.getItem('ex_track_mock_user')
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser)
        setUser(parsed)
        setIsMock(true)
      }
      setLoading(false)
      return
    }

    setIsMock(false)
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (event === 'SIGNED_IN') {
        router.refresh()
      }
      if (event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      // Mock Login Success
      const mockUser: User = {
        id: 'mock-user-uuid-12345',
        app_metadata: {},
        user_metadata: { full_name: 'Guest User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: email,
      }
      localStorage.setItem('ex_track_mock_user', JSON.stringify(mockUser))
      setUser(mockUser)
      
      // Seed initial mock storage data on frontend
      if (!localStorage.getItem('ex_track_initialized')) {
        localStorage.setItem('ex_track_initialized', 'true')
      }

      // Set cookie for middleware bypass
      document.cookie = "ex_track_mock_session=true; path=/; max-age=31536000; SameSite=Lax"

      router.push('/dashboard')
      return { error: null }
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) {
        // If they sign in properly, clear any force mock flag
        localStorage.removeItem('ex_track_force_mock')
        router.push('/dashboard')
      }
      return { error: error?.message ?? null }
    } catch (err: any) {
      return { error: err?.message ?? 'An unexpected error occurred during login.' }
    }
  }

  const loginAsGuest = async () => {
    setIsMock(true)
    const mockUser: User = {
      id: 'mock-user-uuid-12345',
      app_metadata: {},
      user_metadata: { full_name: 'Guest User' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'guest@ex-track.com',
    }
    localStorage.setItem('ex_track_mock_user', JSON.stringify(mockUser))
    localStorage.setItem('ex_track_force_mock', 'true')
    setUser(mockUser)
    
    if (!localStorage.getItem('ex_track_initialized')) {
      localStorage.setItem('ex_track_initialized', 'true')
    }

    // Set cookie for middleware bypass
    document.cookie = "ex_track_mock_session=true; path=/; max-age=31536000; SameSite=Lax"

    router.push('/dashboard')
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured()) {
      // Mock SignUp Success
      const mockUser: User = {
        id: 'mock-user-uuid-12345',
        app_metadata: {},
        user_metadata: { full_name: fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: email,
      }
      localStorage.setItem('ex_track_mock_user', JSON.stringify(mockUser))
      setUser(mockUser)
      
      // Initialize client-side state
      localStorage.setItem('ex_track_initialized', 'true')

      // Set cookie for middleware bypass
      document.cookie = "ex_track_mock_session=true; path=/; max-age=31536000; SameSite=Lax"

      // Trigger client side mock accounts setup in API / local storage
      router.push('/dashboard')
      return { error: null }
    }

    try {
      const supabase = createClient()
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (!error && data.user) {
        // Trigger Server-side mock bank account seed
        await fetch('/api/auth/setup-mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id }),
        })
        router.push('/dashboard')
      }
      return { error: error?.message ?? null }
    } catch (err: any) {
      return { error: err?.message ?? 'An unexpected error occurred during signup.' }
    }
  }

  const signOut = async () => {
    if (isMock) {
      localStorage.removeItem('ex_track_mock_user')
      localStorage.removeItem('ex_track_force_mock')
      document.cookie = "ex_track_mock_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      setUser(null)
      router.push('/login')
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isMock, login, loginAsGuest, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
