import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AssigneeProvider } from "@/contexts/AssigneeContext";
import { GroupProvider } from "@/contexts/GroupContext";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metalogics - Task Manager",
  description: "Stay organized and track your projects efficiently with Metalogics Task Manager - a modern project management solution built with Next.js and TypeScript",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AssigneeProvider>
            <GroupProvider>
              {children}
            </GroupProvider>
          </AssigneeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
