import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    // Allow authenticated requests to proceed
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
     * Match all request paths except:
     * - /auth/* (login, signup pages)
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico
     * - /images/* (public images)
     */
    '/((?!auth|api/auth|_next/static|_next/image|favicon.ico|images).*)'
  ]
}
