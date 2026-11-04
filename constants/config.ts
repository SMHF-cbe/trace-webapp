/**
 * Browser builds should set EXPO_PUBLIC_API_URL to the deployed HTTPS API origin.
 * During local development, the original same-Wi-Fi API default remains available.
 * A production build without an API URL never embeds a private LAN address.
 */
const localDevelopmentApi =
  process.env.NODE_ENV === "development" ? "http://192.168.0.104:8000" : "";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ?? localDevelopmentApi
).replace(/\/$/, "");

/** Turn `/static/...` or relative paths from the API into a full URL for <Image>. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  const p = path.trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return p.startsWith("/") ? `${API_BASE}${p}` : `${API_BASE}/${p}`;
}
