import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from "@/components/error-boundary";
export const metadata: Metadata = {
  title: {
    default: "Magellan CRBI - Citizenship & Residency Advisory Platform",
    template: "%s | Magellan CRBI",
  },
  description:
    "The leading platform for Citizenship & Residency by Investment advisory firms. Streamline your CRBI practice with automated workflows, document management, and client portals.",
  keywords: ["CRBI", "citizenship by investment", "residency by investment", "St. Kitts", "Antigua", "Dominica", "Grenada", "advisory platform", "immigration services"],
  authors: [{ name: "Magellan CRBI" }],
  creator: "Magellan CRBI",
  publisher: "Magellan CRBI",
  openGraph: {
    title: "Magellan CRBI - CRBI Advisory Platform",
    description:
      "Streamline your Citizenship & Residency by Investment practice with our comprehensive management platform. Reduce administrative overhead by 30%.",
    url: "https://magellancrbi.com",
    siteName: "Magellan CRBI",
    images: [
      {
        url: "/og-image.png", // You can add a proper OG image later
        width: 1200,
        height: 630,
        alt: "Magellan CRBI - CRBI Advisory Platform",
      },
    ],
    locale: "en-US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Magellan CRBI - CRBI Advisory Platform",
    description: "Streamline your Citizenship & Residency by Investment practice",
  },
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-[-apple-system,BlinkMacSystemFont]antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          forcedTheme="light"
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
