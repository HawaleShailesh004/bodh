/**
 * Normalize NEXT_PUBLIC_API_URL for fetch() and docs.
 * Vercel envs are often pasted without a scheme (e.g. `my-app.up.railway.app`);
 * Next.js rewrites require `http://` or `https://`.
 */
export function getPublicApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) return "http://localhost:8000";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}
