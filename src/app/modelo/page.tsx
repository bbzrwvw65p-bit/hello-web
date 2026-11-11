import { Suspense } from "react";
import { ModeloView } from "./modelo-view";

export default function ModeloPage() {
  return (
    <Suspense fallback={<main className="screen"><p className="note">Cargando la ficha…</p></main>}>
      <ModeloView />
    </Suspense>
  );
}
