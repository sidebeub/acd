import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open ACD Files | Allen-Bradley Program Viewer',
  description: 'View Studio 5000 ACD files without installing expensive software. Open ControlLogix and CompactLogix programs. Browse ladder logic, tags, and get AI-powered explanations.',
  keywords: ['ACD file viewer', 'open ACD file', 'Studio 5000 alternative', 'Allen-Bradley viewer', 'ControlLogix viewer', 'CompactLogix viewer', 'ACD file reader'],
  openGraph: {
    title: 'Open ACD Files | Allen-Bradley Program Viewer',
    description: 'View Studio 5000 ACD files without expensive software licenses. Browse ladder logic, tags, and program structure for ControlLogix and CompactLogix.',
    type: 'website',
  },
  alternates: {
    canonical: '/acd-file',
  },
}

export default function AcdFileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
