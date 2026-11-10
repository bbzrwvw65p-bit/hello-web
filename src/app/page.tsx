import Link from "next/link";
import { asset } from "@/lib/paths";

export default function HomePage() {
  return (
    <main className="screen" style={{ display: "flex", flexDirection: "column", paddingTop: 36 }}>
      <img src={asset("/hello/wordmark.png")} alt="hello." style={{ width: "100%", maxWidth: 280, margin: "0 auto 28px", display: "block" }} />
      <div className="choices">
        <Link href="/valorar" className="ios-choice glow">
          <img src={asset("/hello/tab-valora.png")} alt="" />
          Valora mi Mac
        </Link>
        <Link href="/recomendar" className="ios-choice glow">
          <img src={asset("/hello/coins.png")} alt="" />
          Recomiéndame un Mac
        </Link>
      </div>
    </main>
  );
}
