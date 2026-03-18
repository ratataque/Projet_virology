import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { SocketProvider } from "@/context/SocketContext";
import { TerminalHistoryProvider } from "@/context/TerminalHistoryContext";
import { CommandMenu } from "@/components/command-menu";
import { SearchButton } from "@/components/ui/search-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "C2 Dashboard",
  description: "Command & Control Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>
            <TerminalHistoryProvider>
              <SidebarProvider>
                <AppSidebar />
                <main className="w-full">
                  <div className="p-4 flex items-center gap-2 w-full">
                    <SidebarTrigger />
                    <span className="font-semibold text-lg">C2 Console</span>
                    <div className="ml-auto flex items-center gap-2">
                      <SearchButton />
                      <ModeToggle />
                    </div>
                  </div>
                  {children}
                </main>
                <Toaster />
                <CommandMenu />
              </SidebarProvider>
            </TerminalHistoryProvider>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
