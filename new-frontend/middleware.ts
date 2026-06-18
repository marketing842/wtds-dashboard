import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/admin/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()

  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    const loginPage = pathname.startsWith('/admin') ? '/admin/login' : '/login'
    return NextResponse.redirect(new URL(loginPage, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
