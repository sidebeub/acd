import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ladder Logic Viewer Online | Free PLC Diagram Viewer',
  description: 'View ladder logic diagrams online free. Supports 215+ PLC instructions with AI explanations. Open L5X, ACD, RSS files. Color-coded visualization for easy understanding.',
  keywords: [
    'ladder logic viewer',
    'ladder diagram viewer',
    'PLC ladder logic viewer',
    'view ladder logic online',
    'ladder logic viewer free',
    'PLC diagram viewer',
    'ladder logic software free',
    'Allen Bradley ladder logic',
    'ladder logic instructions',
    'XIC XIO OTE viewer',
  ],
  openGraph: {
    title: 'Online Ladder Logic Viewer | Free PLC Diagram Viewer',
    description: 'View ladder logic diagrams online free. 215+ instructions supported with AI-powered explanations.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.plc.company/ladder-logic-viewer',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
