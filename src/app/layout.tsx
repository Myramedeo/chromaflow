import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chromaflow",
  description: "A collaborative project management tool built with Next.js, Prisma, and Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (  
    <ClerkProvider>
      <ThemeProvider>
        <html lang="en" suppressHydrationWarning>
          <body className={inter.className}>
            {children}
            <Toaster position="bottom-right" richColors />
          </body>
        </html>
      </ThemeProvider>
    </ClerkProvider>
  );
}
