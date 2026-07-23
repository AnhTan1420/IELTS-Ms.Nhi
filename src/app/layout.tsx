import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "IELTS Writing Practice Platform",
  description: "Secure IELTS Writing practice, realtime teacher tracking, AI grading, and PDF feedback exports.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Cho phép người dùng vẫn pinch-zoom được (ví dụ để xem ảnh Task 1 rõ hơn),
  // chỉ tối ưu để bàn phím ảo không đẩy lệch layout khi gõ bài trên điện thoại.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
