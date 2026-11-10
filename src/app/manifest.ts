import type { MetadataRoute } from "next";
import { asset, basePath } from "@/lib/paths";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const scope = `${basePath}/`;
  return {
    name: "hello.",
    short_name: "hello.",
    description: "Tasa tu Mac de segunda mano y encuentra el siguiente. Precios en euros, para España.",
    start_url: scope,
    scope,
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "es",
    icons: [
      { src: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
  };
}
