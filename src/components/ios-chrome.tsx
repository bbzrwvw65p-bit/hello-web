"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { asset } from "@/lib/paths";

const tabs = [
  { href: "/valorar", label: "Valora mi Mac", icon: "/hello/tab-valora.png" },
  { href: "/recomendar", label: "Recomendar", icon: "/hello/coins.png" },
  { href: "/catalogo", label: "Catálogo", icon: "/hello/tab-catalogo.png" },
  { href: "/acerca", label: "Acerca de", icon: "/hello/tab-acerca.png" },
];

function titleFor(path: string): string {
  if (path.startsWith("/valorar")) return "Valora mi Mac";
  if (path.startsWith("/recomendar")) return "Recomiéndame";
  if (path.startsWith("/resultado")) return "Resultado";
  if (path.startsWith("/catalogo")) return "Catálogo";
  if (path.startsWith("/acerca")) return "Acerca de hello.";
  return "hello.";
}

export function IosChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = path === "/" || tabs.some((tab) => tab.href === path);
  return (
    <div className="ios-app">
      <header className="ios-nav">
        {root ? (
          <button type="button" aria-label="Menú" onClick={() => setOpen(true)}>
            <img src={asset("/hello/menu.png")} alt="" />
          </button>
        ) : (
          <button type="button" aria-label="Atrás" onClick={() => router.back()}>
            <img src={asset("/hello/back.png")} alt="" />
          </button>
        )}
        <h1>{titleFor(path)}</h1>
        <Link href="/acerca" className="icon-btn" aria-label="Acerca de">
          <img src={asset("/hello/tab-acerca.png")} alt="" />
        </Link>
      </header>

      {open && (
        <div className="slide-menu" onClick={() => setOpen(false)}>
          <nav className="slide-panel" onClick={(event) => event.stopPropagation()}>
            <img className="logo" src={asset("/hello/wordmark.png")} alt="hello." />
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href} onClick={() => setOpen(false)}>
                {tab.href === "/recomendar" ? "Recomiéndame un Mac" : tab.label}
              </Link>
            ))}
            <Link href="/" onClick={() => setOpen(false)}>
              Inicio
            </Link>
          </nav>
        </div>
      )}

      {children}

      <nav className="ios-tabs">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={path.startsWith(tab.href) ? "active" : ""}>
            <img src={asset(tab.icon)} alt="" />
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
