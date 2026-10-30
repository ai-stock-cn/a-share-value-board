import type { Metadata } from "next";
import StockDashboard from "./StockDashboard";

export const metadata: Metadata = {
  title: "A股价值看板",
  description: "用股票清单、K线图与股息率档位查看中国平安和云南白药。",
};

export default function Home() {
  return <StockDashboard />;
}
