import { Suspense } from "react";
import { CompararView } from "./comparar-view";

export default function CompararPage() {
  return (
    <Suspense fallback={<main className="screen"><p className="note">Cargando el comparador…</p></main>}>
      <CompararView />
    </Suspense>
  );
}
