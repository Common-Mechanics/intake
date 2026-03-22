import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/intake/theme-provider";
import { SettingsPopover } from "@/components/intake/settings-popover";
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
          {children}
          <SettingsPopover />
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
