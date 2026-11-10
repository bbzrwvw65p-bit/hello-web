import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { IosChrome } from "@/components/ios-chrome";
import { PwaRegister } from "@/components/pwa-register";
import { asset } from "@/lib/paths";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "hello.", template: "%s · hello." },
  description: "Valora tu Mac y deja que hello. te recomiende el siguiente. Precios en euros, España.",
  applicationName: "hello.",
  appleWebApp: { capable: true, title: "hello.", statusBarStyle: "black" },
  icons: {
    icon: [{ url: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
    apple: [{ url: asset("/icons/apple-touch-icon.png"), sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = {
    "--hello-dark": `url("${asset("/hello/darkbackground.png")}")`,
    "--hello-wood": `url("${asset("/hello/fondomadera.png")}")`,
  } as CSSProperties;
  return (
    <html lang="es">
      <body style={theme}>
        <IosChrome>{children}</IosChrome>
        <PwaRegister />
      </body>
    </html>
  );
}
