import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { DemoBar } from "@/components/DemoBar";

export const metadata: Metadata = {
  title: "OrderPilot: custom cake orders, agreed and delivered",
  description:
    "A concept prototype by Ugonwa Ohagwasi. OrderPilot turns custom cake requests into complete, feasible, agreed orders, with an owner workspace and a customer order page.",
};

export const viewport: Viewport = { themeColor: "#f3f4f1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <StoreProvider>
          <DemoBar />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
