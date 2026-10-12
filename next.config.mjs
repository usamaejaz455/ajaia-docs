/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep native/wasm-heavy server deps out of the webpack bundle.
    serverComponentsExternalPackages: ["@electric-sql/pglite", "pg", "mammoth", "sanitize-html"],
    // Next 14 reuses a visited dynamic page for 30s on client navigation, so the dashboard
    // missed documents created or renamed in the meantime. Always fetch it fresh.
    staleTimes: { dynamic: 0 },
  },
};
export default nextConfig;
