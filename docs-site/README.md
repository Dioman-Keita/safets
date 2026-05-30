# SafeTS Docs Site

This is the standalone SafeTS documentation website.

It is intentionally isolated from the CLI package so Vercel can deploy this folder as its own project.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel

Create a Vercel project and set the Root Directory to `docs-site`.

Keep the build command as `npm run build`. TanStack Start uses Nitro here, so Vercel receives a `.vercel/output` build with static assets plus a server function for route rendering.

