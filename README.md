# crosscredit

[Live app](https://crosscredit.haltcase.dev/) · [Source](https://github.com/haltcase/crosscredit)

Pick two movies or TV shows and find their shared cast and crew. A small hobby project built with
React, TanStack Start, TanStack Query, and strict TypeScript. Vite+ supplies the dev server, build,
Vitest, Oxlint, and Oxfmt.

## Run locally

Requires Node 22.18+ (Node 24 recommended) and pnpm 12.16.1. A global Vite+ install is optional; all
project commands use the locked local toolchain.

```sh
pnpm install
```

Copy `.env.example` to `.env`, add your **API Read Access Token** from
[TMDB account settings](https://www.themoviedb.org/settings/api), then run:

```sh
pnpm dev
```

Open http://localhost:3000. Without a token the page explains setup; it does not substitute
fabricated results. Never prefix the token with `VITE_` or commit `.env`.

```sh
pnpm check      # Oxfmt, Oxlint, type-aware lint, and TypeScript checks
pnpm typecheck  # Additional standalone TypeScript compiler check
pnpm test      # Matching and data normalization tests
pnpm build     # Production Cloudflare Worker and static assets
pnpm preview   # Preview the production build locally
```

## Small by design

TypeScript, Oxfmt, and Oxlint use `@haltcase/style@9.0.0-canary.1`. The Vite+ configuration enables
the React, Node, TanStack Router, and TanStack Start lint presets, including type-aware linting and
type checking through `oxlint-tsgolint`. TypeScript extends the package's bundler preset with the
project's stricter compiler options. The `typescript` alias supplies TypeScript 6 for JS lint
plugins; `pnpm typecheck` uses the separate `typescript-7` compiler, as documented by the style
package.

- Start server functions validate inputs and TMDB responses with Zod. Only server code contacts
  TMDB; the token is never sent to the browser.
- Every frontend request uses TanStack Query. Search debounces within its query function and cancels
  stale requests. Picking a title immediately starts loading its credits while the other title is
  chosen.
- Query clients are created per router/SSR request. The server has a bounded, per-process response
  cache (200 entries) and upstream timeouts. In-flight requests stay independent because Workers
  bind I/O to each request. No database, accounts, or persistent infrastructure.
- Selected titles live in the URL. Movie IDs and TV IDs include their media type, so equal numeric
  IDs do not collide. Credits intersect by person ID.
- Cast means acting in both titles; Crew means working on both; Everyone includes mixed acting/crew
  connections. Multiple roles/jobs are merged into one person.
- Movies use `/movie/{id}/credits`; TV uses `/tv/{id}/aggregate_credits` for all recorded episodes,
  including single appearances. No billing, episode-count, or popularity cutoff is applied to
  credits. Missing or uncredited appearances still depend on TMDB's coverage. Episode counts
  describe each role, not an exact episode list.

## Open source and data terms

The application code is MIT licensed. TMDB data, images, and logos are **not** covered by the
application's MIT license. Attribution is included in the site footer. See
[TMDB's API FAQ](https://developer.themoviedb.org/docs/faq) and
[API terms](https://www.themoviedb.org/api-terms-of-use).

`public/tmdb.svg` is the unmodified
[official TMDB logo](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg),
included solely for attribution under
[TMDB's branding requirements](https://www.themoviedb.org/about/logos-attribution).

The intended use is a free, noncommercial hobby site. Donations are not assumed exempt from TMDB's
revenue rules; obtain confirmation from TMDB before adding a donation or sponsorship link.

## Deployment: Cloudflare Workers Free

The app targets Cloudflare Workers using the beta `cf` CLI and Cloudflare Vite plugin v2.
`cloudflare.config.ts` defines the Worker; Vite+ remains the build, test, lint, and format
toolchain. The beta dependencies are pinned. The compatibility date matches the installed local
runtime. No database, KV, Durable Objects, or paid bindings are required. Start server functions
need Workers; uploading only static files to Pages is insufficient.

### Validate locally

```sh
pnpm build
pnpm preview
```

Preview runs the production build locally in the Workers runtime. Local development and preview use
the server-only `TMDB_READ_ACCESS_TOKEN` from your ignored `.env` file. Never prefix it with
`VITE_`. Build output lives in `.cloudflare/output/v0/` and is ignored, together with generated
Cloudflare types and local state. A production build does not require the TMDB token.

```sh
pnpm deploy:check
```

This builds and validates deployment output without uploading anything or requiring Cloudflare
credentials. It does not validate account quotas or production secrets.

### First deployment

1. Create a Cloudflare account and keep Workers on the Free plan.
2. Sign in with `pnpm exec cf auth login`.
3. For your own deployment, change `worker.name` and remove or replace `worker.domains` in
   `cloudflare.config.ts`. The checked-in domain is `crosscredit.haltcase.dev`.
4. Create an ignored `.env.production.local` file containing only
   `TMDB_READ_ACCESS_TOKEN=your-token`.
5. Run `pnpm deploy --secrets-file .env.production.local` to upload the token as a Worker secret
   with the deployment. Never commit this file or put the token in the Cloudflare config.

Cloudflare provides a `workers.dev` address, so a purchased domain is optional. For later code-only
deployments, run `pnpm deploy`; existing secrets are retained. To rotate the TMDB secret, update the
secret file and pass `--secrets-file` again. `cf` does not yet offer a single-secret setter. Deploy
commands publish the app; they are not part of local validation.

For Cloudflare Workers Builds, use `pnpm build` as the build command and
`pnpm exec cf deploy --prebuilt --mode production` as the deploy command. Configure
`TMDB_READ_ACCESS_TOKEN` as a runtime Worker secret, rather than a public build variable.

The response cache is temporary and local to each Worker isolate. Cold starts and different isolates
may fetch the same TMDB data again; correctness does not depend on a warm cache. Free hosting
remains subject to Workers request, CPU, and bundle-size limits. The dry run checks build validity;
exercise representative searches and large TV comparisons after deployment to check CPU usage under
the Free plan.

See the [Cloudflare CLI guide](https://developers.cloudflare.com/cf/projects/) and
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Contributing

Keep TypeScript strict, including indexed access and exact optional-property checks. Use Query for
frontend I/O; do not fetch in effects. Use Vite+/Oxlint/Oxfmt, with no ESLint or Prettier
configuration. Run check, test, and build before proposing changes. Add regression tests for changes
to normalization or matching, particularly guest appearances, multiple roles, and identity
collisions.
