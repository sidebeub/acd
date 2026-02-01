import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Studio 5000 Alternative | Affordable PLC Viewer for Allen-Bradley',
  description: 'Looking for a Studio 5000 alternative? View L5X, ACD, and RSS files without expensive Rockwell licenses. Browser-based PLC viewer with AI explanations.',
  keywords: [
    'Studio 5000 alternative',
    'RSLogix 5000 alternative',
    'RSLogix alternative',
    'affordable PLC software',
    'Rockwell alternative',
    'RSLogix viewer',
    'Allen Bradley alternative',
    'PLC viewer online',
    'view PLC without license',
  ],
  openGraph: {
    title: 'Studio 5000 Alternative | Affordable PLC Viewer',
    description: 'View Allen-Bradley PLC programs without Studio 5000. Browser-based alternative for L5X, ACD, and RSS files.',
    type: 'website',
  },
  alternates: {
    canonical: '/studio-5000-alternative',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
