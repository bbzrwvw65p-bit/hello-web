/** Vacío en la raíz del dominio. En https://usuario.github.io/hello-web/ es `/hello-web`. */
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function asset(path: string): string {
  if (!path || /^(https?:|data:)/.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
