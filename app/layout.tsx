import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "A股价值看板",
    template: "%s | A股价值看板",
  },
  description: "每天自动更新股票清单、K线、四价、振幅与股息率参考价格。",
  openGraph: {
    title: "A股价值看板",
    description: "中国平安与云南白药，行情、K线与股息估值一页看清。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "A股价值看板",
    description: "中国平安与云南白药，行情、K线与股息估值一页看清。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
