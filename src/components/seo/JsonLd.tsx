export function JsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.plc.company";

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PLC Viewer",
    alternateName: ["L5X Viewer", "ACD Viewer", "RSS Viewer", "Allen Bradley PLC Viewer", "Ladder Logic Viewer"],
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Industrial Automation Software",
    operatingSystem: "Web Browser (Chrome, Firefox, Safari, Edge)",
    description:
      "Free online PLC viewer for Allen-Bradley ladder logic. Open and view L5X, ACD, and RSS files without Studio 5000 or RSLogix. AI-powered explanations help you understand any rung instantly.",
    url: siteUrl,
    offers: {
      "@type": "Offer",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "USD",
        description: "Affordable subscription - fraction of Studio 5000 cost"
      },
      availability: "https://schema.org/OnlineOnly"
    },
    featureList: [
      "View L5X files from Studio 5000 without a license",
      "View ACD files from ControlLogix and CompactLogix",
      "View RSS files from RSLogix 500 and RSLogix Micro",
      "Ladder logic visualization with color-coded instructions",
      "AI-powered code explanations in plain English",
      "Tag browser with search and filter",
      "Cross-reference analysis - find every tag usage",
      "Interactive PLC simulation - toggle tags, watch power flow",
      "Timer and counter simulation with real-time updates",
      "Trend charts - graph tag values over time",
      "Watch window - monitor multiple tags live",
      "Fault injection testing - stuck on/off, intermittent, delayed",
      "Program diff - compare two versions of code",
      "Call tree analysis - visualize JSR relationships",
      "Safety analysis - detect E-stops, guards, interlocks",
      "Alarm analysis - find ALMD and ALMA instructions",
      "Signal tracing - trace what affects each tag",
      "Similar rung detection - find duplicate code",
      "Structured text viewer with syntax highlighting",
      "25+ motion control instructions supported",
      "AI chat assistant - ask questions about your program",
      "Export to PDF, CSV, and Markdown",
      "I/O rack visualization with module mapping",
      "Mini-map for program navigation",
      "Bookmarking system for favorite rungs",
      "Mobile-friendly with touch gestures",
      "No software installation required",
      "Works with ControlLogix, CompactLogix, GuardLogix, SLC 500, MicroLogix, and PLC-5",
      "Support for 215+ ladder logic instructions"
    ],
    screenshot: `${siteUrl}/og-image.png`,
    softwareHelp: {
      "@type": "CreativeWork",
      url: `${siteUrl}/l5x-file`
    },
    keywords: "PLC viewer, L5X viewer, ACD viewer, RSS viewer, ladder logic viewer, Allen Bradley, Studio 5000 alternative, RSLogix viewer, ControlLogix, CompactLogix, SLC 500, MicroLogix, free PLC software"
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PLC Viewer",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      "PLC Viewer provides tools to view and analyze Allen-Bradley PLC programs without expensive software licenses.",
    sameAs: [],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What file formats does PLC Viewer support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PLC Viewer supports L5X files from Studio 5000, ACD files from ControlLogix and CompactLogix controllers, and RSS files from RSLogix 500 (SLC 500 and MicroLogix).",
        },
      },
      {
        "@type": "Question",
        name: "Do I need Studio 5000 to view PLC files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, PLC Viewer allows you to view and analyze L5X, ACD, and RSS files directly in your web browser without needing Studio 5000, RSLogix 5000, or any other expensive PLC software.",
        },
      },
      {
        "@type": "Question",
        name: "When will PLC Viewer be available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PLC Viewer is launching soon. Sign up on our website to be notified when we go live.",
        },
      },
      {
        "@type": "Question",
        name: "Which Allen-Bradley controllers are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PLC Viewer supports programs from ControlLogix, CompactLogix, GuardLogix (via L5X and ACD files), and SLC 500 and MicroLogix controllers (via RSS files).",
        },
      },
      {
        "@type": "Question",
        name: "Is my PLC data secure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, your PLC files are processed locally in your browser. Your proprietary program code is not stored on external servers, ensuring your intellectual property remains secure.",
        },
      },
      {
        "@type": "Question",
        name: "What is ladder logic?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ladder logic is a programming language used in PLCs (Programmable Logic Controllers) that uses graphical symbols resembling electrical relay circuits. PLC Viewer visualizes ladder logic diagrams with color-coded instructions to make understanding your programs easier.",
        },
      },
    ],
  };

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PLC Viewer",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    browserRequirements: "Requires JavaScript. Works in all modern browsers.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
    </>
  );
}
