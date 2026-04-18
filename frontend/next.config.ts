/** @type {import('next').NextConfig} */
/** Same rules as `lib/apiBase.ts` — rewrites must use absolute http(s) URLs. */
function publicApiBaseFromEnv() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!raw) return "http://localhost:8000";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}
const apiBase = publicApiBaseFromEnv();

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
