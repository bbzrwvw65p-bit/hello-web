import Link from "next/link";

const links = [
  { href: "/valorar", label: "Valorar" },
  { href: "/recomendar", label: "Recomendar" },
  { href: "/catalogo", label: "Catálogo" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-serif text-[2rem] leading-none tracking-tight">
          hello<span className="text-hello">.</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 text-ink/80 active:bg-ink/5">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
