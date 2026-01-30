import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Studio 5000 Alternative | Free PLC Viewer for Allen-Bradley',
  description: 'Looking for a Studio 5000 alternative? View L5X, ACD, and RSS files free without expensive Rockwell licenses. Browser-based PLC viewer with AI explanations.',
  keywords: [
    'Studio 5000 alternative',
    'RSLogix 5000 alternative',
    'RSLogix alternative',
    'free PLC software',
    'Rockwell alternative',
    'free RSLogix',
    'Allen Bradley alternative',
    'PLC viewer free',
    'view PLC without license',
  ],
  openGraph: {
    title: 'Studio 5000 Alternative | Free PLC Viewer',
    description: 'View Allen-Bradley PLC programs without Studio 5000. Free browser-based alternative for L5X, ACD, and RSS files.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.plc.company/studio-5000-alternative',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
