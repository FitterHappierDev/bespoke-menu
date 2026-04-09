import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/api/auth', '/api/config']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  const role = request.cookies.get('bespoke_role')?.value
  if (pathname.startsWith('/chef')) {
    if (role === 'chef' || role === 'family') return NextResponse.next()
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (pathname.startsWith('/api/')) {
    // Chef can call menu reads, confirm, and chef-proposals endpoints.
    const chefAllowed =
      pathname.startsWith('/api/menu') ||
      pathname.startsWith('/api/confirm') ||
      pathname.startsWith('/api/chef-proposals') ||
      pathname.startsWith('/api/menus/')
    if (role === 'family') return NextResponse.next()
    if (role === 'chef' && chefAllowed) return NextResponse.next()
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (pathname.startsWith('/family')) {
    if (role === 'family') return NextResponse.next()
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
