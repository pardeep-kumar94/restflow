import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Restflow — Visual API Workflow Builder",
    template: "%s | Restflow",
  },
  description:
    "Build, map, and execute multi-step API workflows visually. Import OpenAPI specs, drag endpoints onto a canvas, connect them, map data between responses and requests, and execute — all in your browser.",
  keywords: [
    "API workflow builder",
    "visual API builder",
    "API orchestration tool",
    "REST API testing",
    "API chaining tool",
    "OpenAPI workflow",
    "Swagger workflow builder",
    "API integration tool",
    "visual API testing",
    "API automation",
    "drag and drop API builder",
    "multi-step API workflow",
    "API data mapping",
    "API pipeline builder",
    "no-code API tool",
    "browser-based API tool",
    "Postman alternative",
    "API flow builder",
    "REST API orchestration",
    "OpenAPI import tool",
    "API endpoint chaining",
    "visual REST client",
    "API request builder",
    "Restflow",
  ],
  authors: [{ name: "Restflow" }],
  creator: "Restflow",
  publisher: "Restflow",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Restflow",
    title: "Restflow — Visual API Workflow Builder",
    description:
      "Build, map, and execute multi-step API workflows visually. Import OpenAPI specs, connect endpoints, map data flows, and execute — all in your browser. Free, no sign-up required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Restflow — Visual API Workflow Builder",
    description:
      "Build, map, and execute multi-step API workflows visually. Free, browser-based, no sign-up required.",
    creator: "@restflow",
  },
  icons: {
    icon: "/favicon.svg",
  },
  category: "Developer Tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
