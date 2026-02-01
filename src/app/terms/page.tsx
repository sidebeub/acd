import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for PLC Viewer - Online Allen-Bradley PLC program viewer for L5X, ACD, and RSS files with AI-powered explanations.',
  alternates: {
    canonical: 'https://www.plc.company/terms',
  },
  openGraph: {
    title: 'Terms of Service | PLC Viewer',
    description: 'Terms of Service for PLC Viewer - Online Allen-Bradley PLC program viewer.',
    url: 'https://www.plc.company/terms',
  },
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section style={{ marginBlockEnd: 'var(--space-10)' }}>
      <h2
        className="text-fluid-xl font-semibold"
        style={{
          color: 'var(--text-primary)',
          marginBlockEnd: 'var(--space-4)',
          paddingBlockEnd: 'var(--space-3)',
          borderBlockEnd: '1px solid var(--border-subtle)',
        }}
      >
        {title}
      </h2>
      <div
        className="stack"
        style={{
          gap: 'var(--space-4)',
          color: 'var(--text-secondary)',
          lineHeight: '1.7',
        }}
      >
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  const lastUpdated = 'January 31, 2026'

  return (
    <div className="min-h-screen-safe relative safe-area-inset" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm safe-area-top"
        style={{
          borderBlockEnd: '1px solid var(--border-subtle)',
          background: 'rgba(11, 13, 16, 0.8)',
          minHeight: 'var(--touch-target-min)',
        }}
      >
        <div
          className="container-default flex items-center justify-between"
          style={{ height: 'clamp(56px, 8vw, 64px)' }}
        >
          <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
            <Logo size="sm" />
          </Link>

          <Link
            href="/"
            className="text-fluid-sm font-medium transition-colors hover:text-white flex items-center"
            style={{ color: 'var(--text-tertiary)', gap: 'var(--space-2)' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      <main className="relative z-10" style={{ paddingBlock: 'var(--space-16)' }}>
        <div className="container-default" style={{ maxWidth: '800px' }}>
          {/* Page Header */}
          <div style={{ marginBlockEnd: 'var(--space-12)' }}>
            <h1
              className="text-fluid-4xl font-bold"
              style={{
                color: 'var(--text-primary)',
                marginBlockEnd: 'var(--space-4)',
              }}
            >
              Terms of Service
            </h1>
            <p className="text-fluid-base" style={{ color: 'var(--text-tertiary)' }}>
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Introduction */}
          <div
            className="surface-card"
            style={{
              padding: 'var(--space-6)',
              marginBlockEnd: 'var(--space-10)',
              background: 'var(--accent-muted)',
              border: '1px solid var(--accent)',
            }}
          >
            <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Welcome to PLC Viewer, operated by PLC.company. By accessing or using our service at{' '}
              <a href="https://www.plc.company" style={{ color: 'var(--accent)' }}>
                www.plc.company
              </a>
              , you agree to be bound by these Terms of Service. Please read them carefully before using our platform.
            </p>
          </div>

          {/* Service Description */}
          <Section title="1. Service Description">
            <p className="text-fluid-base">
              PLC Viewer is an online platform that allows users to view and analyze Allen-Bradley PLC program files. Our service supports:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>L5X Files</strong> - XML exports from Studio 5000 Logix Designer
              </li>
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>ACD Files</strong> - Native Studio 5000 project files for ControlLogix and CompactLogix
              </li>
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>RSS Files</strong> - RSLogix 500 project files for SLC 500 and MicroLogix
              </li>
            </ul>
            <p className="text-fluid-base">
              Our platform includes AI-powered explanations to help users understand ladder logic, program structure, and PLC functionality. These explanations are provided as educational aids and should not be considered professional engineering advice.
            </p>
          </Section>

          {/* User Accounts */}
          <Section title="2. User Accounts and Authentication">
            <p className="text-fluid-base">
              To access certain features of PLC Viewer, you may be required to create an account. When creating an account, you agree to:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">Provide accurate and complete information</li>
              <li className="text-fluid-base">Maintain the security of your account credentials</li>
              <li className="text-fluid-base">Notify us immediately of any unauthorized access</li>
              <li className="text-fluid-base">Accept responsibility for all activities under your account</li>
            </ul>
            <p className="text-fluid-base">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in suspicious activity.
            </p>
          </Section>

          {/* Acceptable Use */}
          <Section title="3. Acceptable Use">
            <p className="text-fluid-base">
              You agree to use PLC Viewer only for lawful purposes and in accordance with these Terms. You agree NOT to:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">
                Upload files containing malicious code, viruses, or any content designed to harm our service or other users
              </li>
              <li className="text-fluid-base">
                Attempt to reverse engineer, decompile, or extract the source code of our platform
              </li>
              <li className="text-fluid-base">
                Use automated tools to scrape, crawl, or extract data from our service without permission
              </li>
              <li className="text-fluid-base">
                Share your account credentials or allow unauthorized access to your account
              </li>
              <li className="text-fluid-base">
                Upload files that you do not have the right to access or share
              </li>
              <li className="text-fluid-base">
                Use the service in any way that could damage, disable, or impair our infrastructure
              </li>
            </ul>
          </Section>

          {/* Intellectual Property */}
          <Section title="4. Intellectual Property">
            <p className="text-fluid-base">
              <strong style={{ color: 'var(--text-primary)' }}>Your Content:</strong> You retain full ownership of all PLC program files and data you upload to PLC Viewer. We do not claim any ownership rights over your proprietary control logic, configurations, or intellectual property.
            </p>
            <p className="text-fluid-base">
              <strong style={{ color: 'var(--text-primary)' }}>Our Platform:</strong> PLC Viewer, including its design, features, code, and AI capabilities, is owned by PLC.company and protected by intellectual property laws. You may not copy, modify, or distribute any part of our platform without written permission.
            </p>
            <p className="text-fluid-base">
              <strong style={{ color: 'var(--text-primary)' }}>Trademarks:</strong> Allen-Bradley, Studio 5000, RSLogix, ControlLogix, CompactLogix, and related names are trademarks of Rockwell Automation. PLC Viewer is an independent service and is not affiliated with or endorsed by Rockwell Automation.
            </p>
          </Section>

          {/* Data Handling */}
          <Section title="5. Data Handling and Privacy">
            <p className="text-fluid-base">
              We take the security of your PLC files seriously. Here is how we handle your data:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>Processing:</strong> Files are processed to render visualizations and generate AI explanations
              </li>
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>Storage:</strong> Uploaded files may be temporarily stored to enable viewing functionality
              </li>
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>No Sharing:</strong> We do not sell, share, or distribute your PLC files to third parties
              </li>
              <li className="text-fluid-base">
                <strong style={{ color: 'var(--text-primary)' }}>AI Processing:</strong> When using AI explanations, relevant portions of your code may be processed by our AI systems
              </li>
            </ul>
            <p className="text-fluid-base">
              For complete details on data collection and usage, please review our Privacy Policy.
            </p>
          </Section>

          {/* Limitation of Liability */}
          <Section title="6. Limitation of Liability">
            <div
              style={{
                padding: 'var(--space-5)',
                background: 'var(--accent-amber-muted)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBlockEnd: 'var(--space-4)',
              }}
            >
              <p
                className="text-fluid-base font-medium"
                style={{ color: 'var(--accent-amber)', marginBlockEnd: 'var(--space-2)' }}
              >
                Important Notice
              </p>
              <p className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>
                PLC Viewer is a viewing and educational tool only. It is NOT intended for making production decisions, safety determinations, or replacing professional engineering review.
              </p>
            </div>
            <p className="text-fluid-base">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">
                Our service is provided &quot;as is&quot; without warranties of any kind
              </li>
              <li className="text-fluid-base">
                We are not liable for any damages arising from your use of the service
              </li>
              <li className="text-fluid-base">
                AI-generated explanations may contain errors and should be independently verified
              </li>
              <li className="text-fluid-base">
                We are not responsible for decisions made based on information displayed in our viewer
              </li>
              <li className="text-fluid-base">
                Always consult qualified engineers before implementing changes to PLC systems
              </li>
            </ul>
          </Section>

          {/* Subscription Terms */}
          <Section title="7. Subscription and Payment Terms">
            <p className="text-fluid-base">
              PLC Viewer offers both free and paid subscription tiers. By subscribing to a paid plan, you agree to:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">
                Pay all applicable fees at the rates in effect when charges are incurred
              </li>
              <li className="text-fluid-base">
                Provide valid payment information and keep it up to date
              </li>
              <li className="text-fluid-base">
                Accept that subscriptions may auto-renew unless cancelled before the renewal date
              </li>
              <li className="text-fluid-base">
                Understand that refunds are provided at our discretion
              </li>
            </ul>
            <p className="text-fluid-base">
              We reserve the right to modify pricing with reasonable notice. Detailed subscription terms will be provided when payment features are implemented.
            </p>
          </Section>

          {/* Termination */}
          <Section title="8. Termination">
            <p className="text-fluid-base">
              <strong style={{ color: 'var(--text-primary)' }}>By You:</strong> You may terminate your account at any time by contacting us or using the account deletion feature when available. Upon termination, your right to use the service will immediately cease.
            </p>
            <p className="text-fluid-base">
              <strong style={{ color: 'var(--text-primary)' }}>By Us:</strong> We may suspend or terminate your access to the service immediately, without prior notice, if:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">You breach these Terms of Service</li>
              <li className="text-fluid-base">We are required to do so by law</li>
              <li className="text-fluid-base">We discontinue the service (with reasonable notice)</li>
            </ul>
          </Section>

          {/* Updates to Terms */}
          <Section title="9. Changes to These Terms">
            <p className="text-fluid-base">
              We may update these Terms of Service from time to time. When we make changes:
            </p>
            <ul
              className="stack"
              style={{
                gap: 'var(--space-2)',
                paddingInlineStart: 'var(--space-6)',
                listStyle: 'disc',
              }}
            >
              <li className="text-fluid-base">
                We will update the &quot;Last updated&quot; date at the top of this page
              </li>
              <li className="text-fluid-base">
                For material changes, we will provide notice through the service or via email
              </li>
              <li className="text-fluid-base">
                Your continued use of the service after changes constitutes acceptance of the new terms
              </li>
            </ul>
            <p className="text-fluid-base">
              We encourage you to review these Terms periodically for any updates.
            </p>
          </Section>

          {/* Contact */}
          <Section title="10. Contact Information">
            <p className="text-fluid-base">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div
              className="surface-card"
              style={{
                padding: 'var(--space-5)',
                marginBlockStart: 'var(--space-4)',
              }}
            >
              <p className="text-fluid-base" style={{ color: 'var(--text-primary)' }}>
                <strong>PLC.company</strong>
              </p>
              <p className="text-fluid-base">
                Website:{' '}
                <a href="https://www.plc.company" style={{ color: 'var(--accent)' }}>
                  www.plc.company
                </a>
              </p>
            </div>
          </Section>

          {/* Back to Home */}
          <div
            className="text-center"
            style={{
              marginBlockStart: 'var(--space-12)',
              paddingBlockStart: 'var(--space-8)',
              borderBlockStart: '1px solid var(--border-subtle)',
            }}
          >
            <Link
              href="/"
              className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
              style={{
                paddingInline: 'var(--space-8)',
                paddingBlock: 'var(--space-3)',
                gap: 'var(--space-2)',
                minHeight: 'var(--touch-target-min)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="safe-area-bottom"
        style={{
          borderBlockStart: '1px solid var(--border-subtle)',
          background: 'var(--surface-1)',
          paddingBlock: 'var(--space-8)',
        }}
      >
        <div className="container-default">
          <div className="stack-to-row justify-between items-center" style={{ gap: 'var(--space-4)' }}>
            <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
              <Logo size="sm" />
            </Link>
            <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
              Copyright {new Date().getFullYear()} PLC.company. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
