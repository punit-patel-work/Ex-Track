import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('[') && !supabaseAnonKey.includes('[')

  let supabaseResponse = NextResponse.next({
    request,
  })

  // If Supabase is not configured, or if there's a mock session cookie, allow bypass for mock mode
  const hasMockCookie = request.cookies.has('ex_track_mock_session')

  if (!isSupabaseConfigured) {
    // In pure mock mode without Supabase
    const path = request.nextUrl.pathname
    const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup')
    const isPublicRoute = isAuthRoute || path === '/'

    if (!hasMockCookie && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (hasMockCookie && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session if expired - DO NOT remove
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup')
  
  // Define files or pages that do not require auth
  const isPublicRoute = isAuthRoute || path === '/'

  if (!user && !isPublicRoute && !hasMockCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if ((user || hasMockCookie) && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
