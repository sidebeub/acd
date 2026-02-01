import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'View L5X Files Without Studio 5000 | Online L5X Viewer',
  description: 'Open and view L5X files without Studio 5000. Online L5X viewer for ControlLogix, CompactLogix, and GuardLogix programs. No expensive Rockwell license required. AI-powered explanations.',
  keywords: [
    'view L5X without Studio 5000',
    'L5X viewer online',
    'open L5X file online',
    'L5X viewer no license',
    'ControlLogix viewer',
    'CompactLogix viewer online',
    'view PLC program without Rockwell',
    'L5X file reader',
    'Studio 5000 alternative',
  ],
  openGraph: {
    title: 'View L5X Files Without Studio 5000 | Online Viewer',
    description: 'Open and view L5X files without expensive Studio 5000 licenses. Browser-based viewer for ControlLogix and CompactLogix programs.',
    type: 'website',
  },
  alternates: {
    canonical: '/view-l5x-without-studio-5000',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
