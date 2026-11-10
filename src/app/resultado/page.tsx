import { Suspense } from "react";
import { ResultadoView } from "./resultado-view";

export default function ResultadoPage() {
  return (
    <Suspense fallback={<main className="screen"><p className="note">Calculando la tasación…</p></main>}>
      <ResultadoView />
    </Suspense>
  );
}
