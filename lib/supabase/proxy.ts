import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } } })
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const publicPaths = new Set(['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'])

  if (!user) {
    if (!publicPaths.has(pathname)) return NextResponse.redirect(new URL('/login', request.url))
    return response
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    if (pathname !== '/welcome') return NextResponse.redirect(new URL('/welcome', request.url))
    return response
  }

  if (pathname === '/login' || pathname === '/signup' || pathname === '/welcome') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}
