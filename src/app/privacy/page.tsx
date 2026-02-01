import { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for PLC Viewer. Learn how we collect, use, and protect your data when using our Allen-Bradley PLC file viewer service.',
  alternates: {
    canonical: 'https://www.plc.company/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | PLC Viewer',
    description: 'Privacy Policy for PLC Viewer. Learn how we collect, use, and protect your data.',
    url: 'https://www.plc.company/privacy',
  },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen-safe relative safe-area-inset" style={{ background: 'var(--surface-0)' }}>
      {/* Navigation */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm safe-area-top"
        style={{
          borderBlockEnd: '1px solid var(--border-subtle)',
          background: 'rgba(11, 13, 16, 0.8)',
          minHeight: 'var(--touch-target-min)'
        }}
      >
        <div className="container-default flex items-center justify-between" style={{ height: 'clamp(56px, 8vw, 64px)' }}>
          <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="text-fluid-sm font-medium transition-colors hover:text-white flex items-center"
            style={{ color: 'var(--text-tertiary)', gap: 'var(--space-2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section style={{ paddingBlock: 'var(--space-16)' }}>
          <div className="container-default text-center">
            <h1
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(2rem, 6vw, 3rem)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBlockEnd: 'var(--space-4)',
                lineHeight: '1.2'
              }}
            >
              Privacy Policy
            </h1>
            <p
              className="text-fluid-lg"
              style={{
                color: 'var(--text-secondary)',
                marginBlockEnd: 'var(--space-2)'
              }}
            >
              Last updated: January 31, 2025
            </p>
          </div>
        </section>

        {/* Content */}
        <section style={{ paddingBlockEnd: 'var(--space-24)' }}>
          <div
            className="container-default privacy-content"
            style={{ maxWidth: '800px', marginInline: 'auto' }}
          >
            {/* Introduction */}
            <PolicySection title="Introduction">
              <p style={pStyle}>
                Welcome to PLC Viewer (www.plc.company). We take your privacy seriously and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our service.
              </p>
              <p style={pStyle}>
                By using PLC Viewer, you agree to the collection and use of information in accordance with this policy.
              </p>
            </PolicySection>

            {/* Data We Collect */}
            <PolicySection title="Information We Collect">
              <p style={pStyle}>We collect the following types of information:</p>

              <PolicySubsection title="Account Information">
                <ul style={ulStyle}>
                  <li style={liStyle}><strong>Email address</strong> - Used for account creation, authentication, and service communications</li>
                  <li style={liStyle}><strong>Name</strong> - Provided during account registration or through authentication providers</li>
                </ul>
              </PolicySubsection>

              <PolicySubsection title="PLC Files">
                <ul style={ulStyle}>
                  <li style={liStyle}><strong>Uploaded files</strong> - L5X, ACD, and RSS files you upload to analyze and view</li>
                  <li style={liStyle}><strong>Parsed program data</strong> - Extracted ladder logic, tags, and program structure from your files</li>
                </ul>
              </PolicySubsection>

              <PolicySubsection title="Usage Data">
                <ul style={ulStyle}>
                  <li style={liStyle}>Pages viewed and features used</li>
                  <li style={liStyle}>Time spent on the platform</li>
                  <li style={liStyle}>Browser type and device information</li>
                  <li style={liStyle}>IP address (for security and analytics)</li>
                </ul>
              </PolicySubsection>
            </PolicySection>

            {/* How We Use Data */}
            <PolicySection title="How We Use Your Information">
              <p style={pStyle}>We use the collected information for the following purposes:</p>
              <ul style={ulStyle}>
                <li style={liStyle}><strong>Provide the service</strong> - Parse and display your PLC files, manage your projects</li>
                <li style={liStyle}><strong>AI-powered explanations</strong> - Generate plain-English explanations of your ladder logic</li>
                <li style={liStyle}><strong>Improve our service</strong> - Analyze usage patterns to enhance features and user experience</li>
                <li style={liStyle}><strong>Analytics</strong> - Understand how users interact with our platform</li>
                <li style={liStyle}><strong>Security</strong> - Protect against unauthorized access and abuse</li>
                <li style={liStyle}><strong>Communications</strong> - Send service updates and respond to inquiries</li>
              </ul>
            </PolicySection>

            {/* AI and Claude */}
            <PolicySection title="AI Processing (Anthropic Claude)">
              <p style={pStyle}>
                PLC Viewer uses Anthropic&apos;s Claude AI to provide explanations of your ladder logic code. When you request an AI explanation:
              </p>
              <ul style={ulStyle}>
                <li style={liStyle}>Relevant portions of your PLC code (rungs, instructions, tags) are sent to Anthropic&apos;s Claude API</li>
                <li style={liStyle}>This data is processed to generate human-readable explanations</li>
                <li style={liStyle}>Anthropic processes this data according to their privacy policy and data handling practices</li>
                <li style={liStyle}>We do not send your entire project files - only the specific code sections you request explanations for</li>
              </ul>
              <p style={pStyle}>
                For more information about how Anthropic handles data, please review{' '}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Anthropic&apos;s Privacy Policy
                </a>.
              </p>
            </PolicySection>

            {/* Data Storage */}
            <PolicySection title="Data Storage">
              <p style={pStyle}>Your data is stored and processed as follows:</p>
              <ul style={ulStyle}>
                <li style={liStyle}><strong>Database</strong> - Account information and project metadata are stored in a PostgreSQL database hosted on Railway</li>
                <li style={liStyle}><strong>File processing</strong> - Uploaded PLC files are processed and parsed data is stored securely</li>
                <li style={liStyle}><strong>Hosting</strong> - Our application is hosted on Railway&apos;s secure infrastructure</li>
              </ul>
              <p style={pStyle}>
                All data is stored on servers located in secure data centers with appropriate physical and electronic safeguards.
              </p>
            </PolicySection>

            {/* Cookies */}
            <PolicySection title="Cookies and Session Data">
              <p style={pStyle}>We use cookies for the following purposes:</p>
              <ul style={ulStyle}>
                <li style={liStyle}><strong>Session cookies</strong> - Essential for keeping you logged in and maintaining your session</li>
                <li style={liStyle}><strong>Authentication tokens</strong> - Securely verify your identity across requests</li>
              </ul>
              <p style={pStyle}>
                We do not use cookies for advertising or third-party tracking purposes. You can configure your browser to refuse cookies, but this may limit your ability to use certain features of our service.
              </p>
            </PolicySection>

            {/* Third Parties */}
            <PolicySection title="Third-Party Services">
              <p style={pStyle}>We work with the following third-party service providers:</p>
              <ul style={ulStyle}>
                <li style={liStyle}><strong>Anthropic</strong> - AI processing for code explanations (Claude API)</li>
                <li style={liStyle}><strong>Railway</strong> - Application and database hosting</li>
                <li style={liStyle}><strong>Stripe</strong> - Payment processing for premium features (coming soon)</li>
              </ul>
              <p style={pStyle}>
                Each of these providers has their own privacy policies governing how they handle data. We only share the minimum information necessary for each service to function.
              </p>
            </PolicySection>

            {/* Data Retention */}
            <PolicySection title="Data Retention">
              <ul style={ulStyle}>
                <li style={liStyle}><strong>Account data</strong> - Retained while your account is active</li>
                <li style={liStyle}><strong>Project files</strong> - Kept while your account is active and you have not deleted them</li>
                <li style={liStyle}><strong>Usage logs</strong> - Retained for up to 12 months for analytics and security purposes</li>
              </ul>
              <p style={pStyle}>
                Upon account deletion or request, we will delete your personal data and project files within 30 days, except where we are required to retain certain information for legal or security purposes.
              </p>
            </PolicySection>

            {/* User Rights */}
            <PolicySection title="Your Rights">
              <p style={pStyle}>You have the following rights regarding your data:</p>
              <ul style={ulStyle}>
                <li style={liStyle}><strong>Access</strong> - Request a copy of the personal data we hold about you</li>
                <li style={liStyle}><strong>Correction</strong> - Request correction of inaccurate personal data</li>
                <li style={liStyle}><strong>Deletion</strong> - Request deletion of your account and associated data</li>
                <li style={liStyle}><strong>Export</strong> - Export your data in a portable format</li>
                <li style={liStyle}><strong>Restriction</strong> - Request restriction of processing in certain circumstances</li>
                <li style={liStyle}><strong>Objection</strong> - Object to processing of your personal data</li>
              </ul>
              <p style={pStyle}>
                To exercise any of these rights, please contact us using the information provided below.
              </p>
            </PolicySection>

            {/* Security */}
            <PolicySection title="Security Measures">
              <p style={pStyle}>We implement appropriate security measures to protect your data:</p>
              <ul style={ulStyle}>
                <li style={liStyle}>Encryption of data in transit (HTTPS/TLS)</li>
                <li style={liStyle}>Secure authentication mechanisms</li>
                <li style={liStyle}>Regular security reviews and updates</li>
                <li style={liStyle}>Access controls limiting who can view your data</li>
                <li style={liStyle}>Secure hosting infrastructure with Railway</li>
              </ul>
              <p style={pStyle}>
                While we strive to protect your personal information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but are committed to maintaining industry-standard protections.
              </p>
            </PolicySection>

            {/* GDPR/CCPA */}
            <PolicySection title="GDPR and CCPA Compliance">
              <PolicySubsection title="For EU/EEA Users (GDPR)">
                <p style={pStyle}>
                  If you are located in the European Union or European Economic Area, you have additional rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with your local data protection authority.
                </p>
                <p style={pStyle}>
                  Our legal basis for processing your data includes: consent (where you have provided it), contract performance (to provide our services), and legitimate interests (to improve our service and ensure security).
                </p>
              </PolicySubsection>

              <PolicySubsection title="For California Residents (CCPA)">
                <p style={pStyle}>
                  Under the California Consumer Privacy Act (CCPA), California residents have the right to:
                </p>
                <ul style={ulStyle}>
                  <li style={liStyle}>Know what personal information we collect</li>
                  <li style={liStyle}>Delete personal information</li>
                  <li style={liStyle}>Opt-out of the sale of personal information (we do not sell personal information)</li>
                  <li style={liStyle}>Non-discrimination for exercising your privacy rights</li>
                </ul>
              </PolicySubsection>
            </PolicySection>

            {/* Children */}
            <PolicySection title="Children's Privacy">
              <p style={pStyle}>
                PLC Viewer is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </PolicySection>

            {/* Changes */}
            <PolicySection title="Changes to This Policy">
              <p style={pStyle}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
              <p style={pStyle}>
                We encourage you to review this Privacy Policy periodically for any changes. Changes are effective when posted on this page.
              </p>
            </PolicySection>

            {/* Contact */}
            <PolicySection title="Contact Us">
              <p style={pStyle}>
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div
                style={{
                  padding: 'var(--space-6)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  marginBlockStart: 'var(--space-4)'
                }}
              >
                <p style={{ marginBlockEnd: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>PLC Viewer</strong>
                </p>
                <p style={{ marginBlockEnd: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                  Website: <a href="https://www.plc.company" style={linkStyle}>www.plc.company</a>
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Email: <a href="mailto:privacy@plc.company" style={linkStyle}>privacy@plc.company</a>
                </p>
              </div>
            </PolicySection>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="safe-area-bottom"
          style={{
            borderBlockStart: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)',
            paddingBlock: 'var(--space-12)'
          }}
        >
          <div className="container-default">
            <div className="stack-to-row justify-between" style={{ gap: 'var(--space-6)' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
                <Logo size="sm" />
              </Link>
              <div className="flex items-center" style={{ gap: 'var(--space-6)' }}>
                <Link href="/l5x-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>L5X Viewer</Link>
                <Link href="/acd-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ACD Viewer</Link>
                <Link href="/rss-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>RSS Viewer</Link>
              </div>
            </div>
            <div style={{ marginBlockStart: 'var(--space-6)', textAlign: 'center' }}>
              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} PLC Viewer. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

// Shared styles
const pStyle: React.CSSProperties = {
  marginBlockEnd: 'var(--space-4)',
  color: 'var(--text-secondary)',
  lineHeight: '1.8'
}

const ulStyle: React.CSSProperties = {
  marginBlockEnd: 'var(--space-4)',
  paddingInlineStart: 'var(--space-6)',
  listStyleType: 'disc',
  color: 'var(--text-secondary)',
  lineHeight: '1.8'
}

const liStyle: React.CSSProperties = {
  marginBlockEnd: 'var(--space-2)'
}

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px'
}

// Reusable components for policy sections
function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBlockEnd: 'var(--space-10)' }}>
      <h2
        className="text-fluid-2xl font-semibold"
        style={{
          color: 'var(--text-primary)',
          marginBlockEnd: 'var(--space-4)',
          paddingBlockEnd: 'var(--space-3)',
          borderBlockEnd: '1px solid var(--border-subtle)'
        }}
      >
        {title}
      </h2>
      <div>
        {children}
      </div>
    </div>
  )
}

function PolicySubsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBlockStart: 'var(--space-4)', marginBlockEnd: 'var(--space-4)' }}>
      <h3
        className="text-fluid-lg font-medium"
        style={{
          color: 'var(--text-primary)',
          marginBlockEnd: 'var(--space-3)'
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}
