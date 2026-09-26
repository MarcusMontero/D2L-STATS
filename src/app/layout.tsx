import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D2L Courtside Control Panel | District 2 League Ayala Alabang",
  description:
    "Official Courtside Live Stat Tracking and League Management System for District 2 League (D2L) at Ayala Alabang Village.",
  keywords: ["D2L", "District 2 League", "Ayala Alabang", "Basketball", "Live Stats", "Box Score"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06180E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-d2l-dark text-gray-100 min-h-screen bg-court-pattern antialiased selection:bg-d2l-orange selection:text-white">
        {children}
      </body>
    </html>
  );
}
