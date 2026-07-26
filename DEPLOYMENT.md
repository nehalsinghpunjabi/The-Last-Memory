# Deployment

THE LAST MEMORY has no backend, no database, no environment variables and no
external asset hosting. Everything — images, audio, geometry — is generated in
the browser from seeds. That makes deployment about as simple as it gets.

## Requirements

- Node 18.18+ (Node 20 or 22 LTS recommended for CI)
- No API keys, no secrets, no `.env` file

## Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Zero configuration required — Vercel detects Next.js 15 automatically. Build
command `next build`, output handled by the framework preset.

For production:

```bash
vercel --prod
```

## Netlify

```bash
npm i -D @netlify/plugin-nextjs
```

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Node server (anywhere)

```bash
npm ci
npm run build
npm start          # serves on $PORT, default 3000
```

Put it behind nginx/Caddy as a normal reverse proxy. There are no websockets and
no server-side state, so any number of instances can run behind a load balancer
with no coordination.

## Docker

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

Optionally add `output: 'standalone'` to `next.config.mjs` and copy
`.next/standalone` instead, for a much smaller final image.

## Fully static export

The experience is a single client-rendered route with no server features, so it
exports cleanly:

```js
// next.config.mjs
const nextConfig = {
  output: 'export',
  // ...keep the rest
};
```

```bash
npm run build     # writes ./out
```

Upload `out/` to S3 + CloudFront, GitHub Pages, Cloudflare Pages, or any static
host. This is the cheapest way to run it and costs nothing at rest.

## Recommended headers

Not required, but they measurably improve first paint and protect the
experience:

```
Cache-Control: public, max-age=31536000, immutable    # /_next/static/*
Cache-Control: public, max-age=0, must-revalidate     # HTML

Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

`unsafe-eval` is needed by Next's dev runtime only — you can drop it in
production. `blob:` and `data:` are needed because memory textures are painted
to canvas at runtime.

## Pre-deploy checklist

```bash
npm run typecheck        # tsc --noEmit
npm run build            # production build must be clean
npm run dev              # then, in another terminal:
npm run verify           # headless playthrough of all 8 chapters
```

`npm run verify` is the one that matters: it catches WebGL shader compile and
link failures, which neither the type-check nor the build will detect. A shader
that fails to compile produces a black screen in production and a green
checkmark in CI.

## CI example (GitHub Actions)

```yaml
name: build
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npx next start & npx wait-on http://localhost:3000
      - run: npm run verify
        env:
          CHROME_PATH: /usr/bin/google-chrome
```

## Performance notes for production

- The first load is ~304 kB of JS (gzipped chunks), dominated by three.js. There
  is no image, font or audio download at all — first meaningful paint is the
  boot terminal, which renders before three.js has finished parsing.
- Shader compilation is the real startup cost. The boot sequence is deliberately
  ~2.6 seconds long to cover it; do not shorten it without re-measuring on a
  cold cache and a mid-range laptop.
- Enable HTTP/2 or HTTP/3 and Brotli. The JS chunks compress extremely well.

## Browser support

Requires WebGL2. Chrome/Edge 90+, Firefox 90+, Safari 15+.

There is no WebGL fallback scene by design — but the full screenplay is present
in the DOM as a visually-hidden transcript, so a browser that cannot render the
film can still read the story, and screen readers get it regardless.
