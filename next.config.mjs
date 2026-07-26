/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // WebGL contexts + GSAP timelines should not be double-mounted
  transpilePackages: ['three', 'postprocessing'],
  // `next build` and `next dev` both write to distDir. Running a build while a
  // dev server is live replaces the chunks the dev server is still serving from,
  // which breaks it at runtime with `__webpack_modules__[moduleId] is not a
  // function` (its in-memory module registry no longer matches what is on disk).
  // Verification builds set NEXT_DIST_DIR so they can never clobber a dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack: (config) => {
    // Allow importing raw .glsl / .vert / .frag files if you prefer them over the
    // typed shader modules in src/shaders (which are used by default).
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
