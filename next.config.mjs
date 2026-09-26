/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com", "supabase.co"],
    unoptimized: true,
  },
};

export default nextConfig;
