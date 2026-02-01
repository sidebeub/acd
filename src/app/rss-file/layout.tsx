import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open RSS Files | SLC 500 & MicroLogix Program Viewer',
  description: 'View RSLogix 500 programs without expensive software. Open RSS files for SLC 500 (5/01-5/05) and MicroLogix (1000, 1100, 1200, 1400) PLCs. No RSLogix 500 license required.',
  keywords: ['RSS file viewer', 'RSLogix 500 alternative', 'SLC 500 viewer', 'MicroLogix viewer', 'open RSS file', 'SLC 500 program viewer', 'MicroLogix program viewer', 'legacy PLC viewer'],
  openGraph: {
    title: 'Open RSS Files | SLC 500 & MicroLogix Program Viewer',
    description: 'View RSLogix 500 programs without expensive software. Upload RSS files and instantly browse ladder logic for SLC 500 and MicroLogix PLCs.',
    type: 'website',
  },
  alternates: {
    canonical: '/rss-file',
  },
}

export default function RssFileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
