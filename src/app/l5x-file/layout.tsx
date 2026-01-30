import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open L5X Files | View ControlLogix Programs Without Studio 5000',
  description: 'View Studio 5000 L5X exports without expensive software. Open ControlLogix, CompactLogix, and GuardLogix programs. Browse ladder logic, tags, and program structure instantly.',
  keywords: ['L5X viewer', 'open L5X file', 'ControlLogix export viewer', 'Studio 5000 alternative', 'CompactLogix viewer', 'L5X file reader', 'Allen-Bradley L5X'],
  openGraph: {
    title: 'Open L5X Files | View ControlLogix Programs Without Studio 5000',
    description: 'View Studio 5000 L5X exports without expensive software. Browse ladder logic, tags, and program structure for ControlLogix and CompactLogix controllers.',
    type: 'website',
  },
}

export default function L5xFileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
