import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Allen-Bradley PLC Viewer | View L5X, ACD, RSS Online',
  description: 'Affordable Allen-Bradley PLC viewer. Open ControlLogix, CompactLogix, SLC 500, and MicroLogix programs online. No expensive Rockwell license needed. AI-powered ladder logic explanations.',
  keywords: [
    'Allen Bradley viewer',
    'PLC viewer online',
    'Allen Bradley software alternative',
    'view PLC program online',
    'ControlLogix viewer',
    'CompactLogix viewer',
    'SLC 500 viewer',
    'MicroLogix viewer',
    'ladder logic viewer',
    'Rockwell PLC viewer',
  ],
  openGraph: {
    title: 'Allen-Bradley PLC Viewer',
    description: 'View Allen-Bradley PLC programs online. Supports ControlLogix, CompactLogix, SLC 500, and MicroLogix. No expensive license required.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.plc.company/free-allen-bradley-plc-viewer',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
