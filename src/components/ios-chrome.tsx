"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { asset } from "@/lib/paths";

const tabs = [
  { href: "/recomendar", label: "Recomienda", icon: "/icons/tabs/recomienda.svg" },
  { href: "/valorar", label: "Valora", icon: "/icons/tabs/valora.svg" },
  { href: "/mi-mac", label: "Mi Mac", icon: "/icons/tabs/mimac.svg" },
  { href: "/comparar", label: "Compara", icon: "/icons/tabs/compara.svg" },
  { href: "/catalogo", label: "Catálogo", icon: "/icons/tabs/catalogo.svg" },
];

const menu = [
  { href: "/", label: "Inicio" },
  { href: "/recomendar", label: "Recomiéndame un Mac" },
  { href: "/valorar", label: "Valora mi Mac" },
  { href: "/mi-mac", label: "¿Cambiar o esperar?" },
  { href: "/comparar", label: "Comparar Mac" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/checklist", label: "Comprar usado sin sustos" },
  { href: "/acerca", label: "Acerca de hello." },
];

function clean(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

function titleFor(path: string): string {
  if (path.startsWith("/valorar")) return "Valora mi Mac";
  if (path.startsWith("/recomendar")) return "Recomiéndame";
  if (path.startsWith("/resultado")) return "Tasación";
  if (path.startsWith("/catalogo")) return "Catálogo";
  if (path.startsWith("/modelo")) return "Ficha";
  if (path.startsWith("/comparar")) return "Comparar";
  if (path.startsWith("/mi-mac")) return "¿Cambiar o esperar?";
  if (path.startsWith("/checklist")) return "Comprar usado";
  if (path.startsWith("/acerca")) return "Acerca de";
  return "";
}

export function IosChrome({ children }: { children: React.ReactNode }) {
  const path = clean(usePathname());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = path === "/" || tabs.some((tab) => tab.href === path);
  const title = titleFor(path);
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
        <h1>{title || <span className="word">hello<span className="dot" /></span>}</h1>
        <Link href="/acerca" className="icon-btn" aria-label="Acerca de">
          <img src={asset("/hello/help.png")} alt="" />
        </Link>
      </header>

      {open && (
        <div className="slide-menu" onClick={() => setOpen(false)}>
          <nav className="slide-panel" onClick={(event) => event.stopPropagation()}>
            <div className="word">hello<span className="dot" /></div>
            {menu.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
                <span className="mono">→</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {children}

      <nav className="ios-tabs" aria-label="Secciones">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={path.startsWith(tab.href) ? "active" : ""}>
            <img src={asset(tab.icon)} alt="" width={26} height={26} />
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
