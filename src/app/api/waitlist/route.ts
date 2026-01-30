import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, source } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if already signed up
    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existing) {
      return NextResponse.json(
        { message: 'You\'re already on the waitlist!', alreadyExists: true },
        { status: 200 }
      )
    }

    // Create new entry
    await prisma.waitlistEntry.create({
      data: {
        email: email.toLowerCase(),
        source: source || 'homepage'
      }
    })

    return NextResponse.json(
      { message: 'Successfully joined the waitlist!' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Waitlist signup error:', error)
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

// GET endpoint to check waitlist count (admin only in future)
export async function GET() {
  try {
    const count = await prisma.waitlistEntry.count()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Waitlist count error:', error)
    return NextResponse.json(
      { error: 'Failed to get waitlist count' },
      { status: 500 }
    )
  }
}
