import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
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

export const config = {
  matcher: [
    /*
     * Only protect authenticated routes:
     * - /project/* (viewing PLC projects)
     * - /dashboard/* (user dashboard)
     * - /settings/* (user settings)
     *
     * Public routes (NOT matched):
     * - / (homepage)
     * - /l5x-file, /acd-file, /rss-file (landing pages)
     * - /auth/* (login, signup)
     * - /api/* (API routes handle their own auth)
     * - /_next/*, /favicon.ico, etc (static assets)
     */
    '/project/:path*',
    '/dashboard/:path*',
    '/settings/:path*'
  ]
}
