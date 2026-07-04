import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "ومضة | مشاركة الملفات الفورية",
  description: "منصة ومضة تسهل على الطلاب مشاركة واستقبال الملفات والروابط فورياً داخل الفصول والقاعات الدراسية وعرضها مباشرة على أجهزة الجامعة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
