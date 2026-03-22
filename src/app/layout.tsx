import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/intake/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intake — Common Mechanics",
  description: "Client onboarding for AI-powered publications",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {/* Skip link for keyboard/screen-reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          {children}
          {/* Desktop: bottom-right. Mobile: top-center via CSS override */}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
