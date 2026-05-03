import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { GlobalNav } from "@/components/GlobalNav";

const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOai — AI를 쓰지 못하는 SNS",
  description:
    "AI 시대의 인스타그램. 모든 사진과 글은 진짜 사람이 찍고 쓴 것만.",
  metadataBase: new URL("https://noai.kr"),
  openGraph: {
    title: "NOai — AI를 쓰지 못하는 SNS",
    description: "Made by Human Only ✍️",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoSerif.variable} ${notoSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col relative pb-14 sm:pb-0">
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}
