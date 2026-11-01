# Project conventions

- React and TanStack Start. Strict TypeScript is required; do not loosen tsconfig.
- All frontend network reads go through TanStack Query. No useEffect + fetch.
- Vite+ provides Oxlint, Oxfmt, and Vitest. Do not add ESLint or Prettier.
- Keep TMDB credentials server-only, never in VITE_ variables.
- Compare by person ID, merge roles/jobs, and retain one-episode credits.
- Keep the first version small: no database, accounts, or infrastructure without a need.
- Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for code changes.
