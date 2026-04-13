import type { Metadata } from "next";
import { Inter, Cinzel, EB_Garamond, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-display" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-serif" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "StudyPact - Commit. Learn. Earn.",
  description: "Stay accountable to your study goals with grouped financial stakes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${cinzel.variable} ${ebGaramond.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background antialiased selection:bg-primary/30">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
