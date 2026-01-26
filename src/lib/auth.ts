import { NextAuthOptions, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],

  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        const isValid = await compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    }),

    // Google OAuth (optional - only enabled if env vars are set)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true
          })
        ]
      : [])
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login'
  },

  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to the JWT token
      if (user) {
        token.id = user.id
      }
      return token
    },

    async session({ session, token }) {
      // Add user ID to the session
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },

    async signIn({ user, account }) {
      // For OAuth providers, check if user exists or create one
      if (account?.provider === 'google' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (!existingUser) {
          // Create user for OAuth sign-in (no password needed)
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || '',
              password: '' // OAuth users don't have a password
            }
          })
        }
      }
      return true
    }
  },

  debug: process.env.NODE_ENV === 'development'
}

/**
 * Get the current session on the server side
 */
export async function getAuthSession() {
  return getServerSession(authOptions)
}

/**
 * Require authentication - throws if not logged in
 * Use in API routes to protect endpoints
 */
export async function requireAuth() {
  const session = await getAuthSession()

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return session.user as { id: string; email: string; name?: string }
}

// Extend NextAuth types to include user ID
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
