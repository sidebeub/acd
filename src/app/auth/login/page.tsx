'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(error ? 'Invalid email or password' : '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setErrorMessage('Invalid email or password')
        setLoading(false)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    setLoading(true)
    signIn('google', { callbackUrl })
  }

  return (
    <div className="container-narrow">
      {/* Logo/Brand */}
      <div style={{
        textAlign: 'center',
        marginBottom: 'var(--space-8)'
      }}>
        <Link href="/" style={{ display: 'inline-block', color: 'white', textDecoration: 'none', marginBottom: 'var(--space-4)' }}>
          <Logo size="md" />
        </Link>
        <p style={{
          fontSize: 'var(--text-base)',
          color: 'var(--text-secondary)'
        }}>
          Sign in to your account
        </p>
      </div>

      {/* Login Form */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-8)'
      }}>
        {errorMessage && (
          <div style={{
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            background: 'var(--accent-red-muted)',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)'
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--text-secondary)'
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                minHeight: '44px',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--text-secondary)'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                minHeight: '44px',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
              fontSize: 'var(--text-base)',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: 'var(--space-6) 0'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
          <span style={{ padding: '0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            minHeight: '44px',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: 'var(--text-base)',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            transition: 'opacity 0.2s ease'
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign up link */}
        <p style={{
          marginTop: 'var(--space-6)',
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)'
        }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            style={{
              fontWeight: 500,
              color: 'var(--accent-blue)',
              textDecoration: 'none'
            }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-0)',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
      <Suspense fallback={
        <div className="container-narrow" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
