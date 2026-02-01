import { withAuth } from 'next-auth/middleware'
import { NextResponse, NextRequest } from 'next/server'

const SITE_DOMAIN = 'www.plc.company'

// Middleware for HTTP→HTTPS and canonical domain redirects (SEO)
function handleRedirects(request: NextRequest): NextResponse | null {
  const { host, pathname, search } = request.nextUrl

  // Skip redirects in development
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  // Skip redirects for Railway healthchecks (internal IPs)
  // Railway healthchecks come from internal network with no x-forwarded headers
  const userAgent = request.headers.get('user-agent') || ''
  const isHealthcheck = userAgent.includes('Railway') ||
                        userAgent.includes('kube-probe') ||
                        !request.headers.get('x-forwarded-for')

  if (isHealthcheck && pathname === '/') {
    return null
  }

  // Check if we need to redirect
  const isHttp = request.headers.get('x-forwarded-proto') === 'http'
  const isWrongDomain = host !== SITE_DOMAIN && !host.includes('localhost') && !host.includes('railway')

  if (isHttp || isWrongDomain) {
    const url = new URL(`https://${SITE_DOMAIN}${pathname}${search}`)
    return NextResponse.redirect(url, 301)
  }

  return null
}

// Auth middleware wrapper
const authMiddleware = withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/auth/login'
    }
  }
)

// Main middleware function
export default function middleware(request: NextRequest) {
  // First, handle HTTP→HTTPS and domain redirects for all routes
  const redirect = handleRedirects(request)
  if (redirect) {
    return redirect
  }

  // Check if this is a protected route that needs auth
  const { pathname } = request.nextUrl
  const isProtectedRoute =
    pathname.startsWith('/project') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings')

  if (isProtectedRoute) {
    // Use the auth middleware for protected routes
    return (authMiddleware as unknown as (req: NextRequest) => NextResponse)(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all routes except static files and Next.js internals
     * This ensures HTTP→HTTPS redirects work for all pages
     *
     * Protected routes (require auth):
     * - /project/* (viewing PLC projects)
     * - /dashboard/* (user dashboard)
     * - /settings/* (user settings)
     *
     * Public routes (no auth, but still get HTTPS redirect):
     * - / (homepage)
     * - /l5x-file, /acd-file, /rss-file (landing pages)
     * - /auth/* (login, signup)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ]
}
