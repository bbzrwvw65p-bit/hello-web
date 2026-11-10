import Link from "next/link";

export default function NotFound() {
  return (
    <main className="screen">
      <h1 className="question">Ese Mac no está</h1>
      <p className="note" style={{ textAlign: "center" }}>El enlace no coincide con ningún modelo del catálogo.</p>
      <div className="choices" style={{ marginTop: 18 }}>
        <Link href="/valorar" className="ios-choice">Valorar un Mac</Link>
        <Link href="/catalogo" className="ios-choice">Ir al catálogo</Link>
      </div>
    </main>
  );
}
