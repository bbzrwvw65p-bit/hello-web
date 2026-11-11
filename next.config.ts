import type { NextConfig } from "next";
import { CUSTOM_DOMAIN } from "./src/config/site";

// Con dominio propio la web vive en la raíz: el basePath se ignora.
const basePath = CUSTOM_DOMAIN.trim() ? "" : (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
