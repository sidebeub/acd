import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/providers/SessionProvider";
import { SimulationProvider } from "@/components/ladder/SimulationContext";
import { GlobalWatchWindow } from "@/components/simulation/GlobalWatchWindow";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.plc.company";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PLC Viewer | Open L5X, ACD, RSS Files Without Studio 5000",
    template: "%s | PLC Viewer",
  },
  description:
    "Online PLC viewer for Allen-Bradley ladder logic. Open and view L5X, ACD, and RSS files without Studio 5000. Visualize ControlLogix, CompactLogix, and SLC 500 programs with AI-powered explanations.",
  keywords: [
    "PLC viewer",
    "L5X viewer",
    "ACD viewer",
    "RSS viewer",
    "Allen-Bradley",
    "ladder logic viewer",
    "Studio 5000 alternative",
    "ControlLogix viewer",
    "CompactLogix viewer",
    "RSLogix 5000",
    "RSLogix 500",
    "PLC program viewer",
    "PLC software",
    "ladder logic visualization",
    "Rockwell Automation",
    "SLC 500 viewer",
    "MicroLogix viewer",
    "online PLC viewer",
    "view L5X without Studio 5000",
    "ladder logic viewer",
    "RSLogix alternative",
    "open L5X file online",
    "PLC file viewer online",
    "GuardLogix viewer",
    "Allen Bradley viewer online",
  ],
  authors: [{ name: "PLC Viewer" }],
  creator: "PLC Viewer",
  publisher: "PLC Viewer",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "PLC Viewer",
    title: "PLC Viewer | Open L5X, ACD, RSS Files Without Studio 5000",
    description:
      "Online PLC viewer for Allen-Bradley ladder logic. View L5X, ACD, and RSS files without Studio 5000. Get AI-powered explanations of your PLC code.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PLC Viewer - Allen-Bradley Ladder Logic Viewer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PLC Viewer | Open L5X, ACD, RSS Files Without Studio 5000",
    description:
      "Online PLC viewer for Allen-Bradley ladder logic. View L5X, ACD, and RSS files without Studio 5000.",
    images: ["/og-image.png"],
    creator: "@plcviewer",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Plausible Analytics - privacy-friendly, no cookie consent required */}
        <script defer data-domain="plc.company" src="https://plausible.io/js/script.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <AuthProvider>
          <SimulationProvider>
            {children}
            <GlobalWatchWindow />
          </SimulationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
