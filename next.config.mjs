/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep native/wasm-heavy server deps out of the webpack bundle.
    serverComponentsExternalPackages: ["@electric-sql/pglite", "pg", "mammoth", "sanitize-html"],
  },
};
export default nextConfig;
