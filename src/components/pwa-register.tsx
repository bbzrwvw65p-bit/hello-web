"use client";

import { useEffect } from "react";
import { asset, basePath } from "@/lib/paths";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(asset("/sw.js"), { scope: `${basePath}/` }).catch(() => undefined);
  }, []);
  return null;
}
