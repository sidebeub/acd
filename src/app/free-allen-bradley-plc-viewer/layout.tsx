import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Allen-Bradley PLC Viewer | View L5X, ACD, RSS Online',
  description: 'Free Allen-Bradley PLC viewer. Open ControlLogix, CompactLogix, SLC 500, and MicroLogix programs online. No Rockwell license needed. AI-powered ladder logic explanations.',
  keywords: [
    'free Allen Bradley viewer',
    'free PLC viewer',
    'Allen Bradley software free',
    'view PLC program free',
    'ControlLogix viewer free',
    'CompactLogix viewer',
    'SLC 500 viewer',
    'MicroLogix viewer',
    'free ladder logic viewer',
    'Rockwell PLC viewer free',
  ],
  openGraph: {
    title: 'Free Allen-Bradley PLC Viewer',
    description: 'View Allen-Bradley PLC programs free online. Supports ControlLogix, CompactLogix, SLC 500, and MicroLogix. No license required.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.plc.company/free-allen-bradley-plc-viewer',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
