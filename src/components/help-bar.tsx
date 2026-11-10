"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/paths";

export function HelpBar({ message }: { message: string }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setFlash(false), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <>
      <button type="button" className={flash ? "flash" : ""} onClick={() => setOpen(true)} aria-label="Ayuda" style={{ background: "none", border: 0 }}>
        <img src={asset("/hello/help.png")} alt="" width={28} height={28} />
      </button>
      {open ? (
        <div className="help-pop" onClick={() => setOpen(false)}>
          <div className="help-card" onClick={(event) => event.stopPropagation()}>
            <p>{message}</p>
            <button type="button" className="ios-choice" style={{ marginTop: 14 }} onClick={() => setOpen(false)}>
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
