# Clov Web — Agent Guide

## Start here

1. Read this file.
2. Read `docs/API-CONTRACT.md`; its linked SSOT is the only API contract.
3. Read `../web-design-repository/docs/AI-TEAM-HARNESS.md` before starting an issue.
4. Read `../web-design-repository/docs/CODE-CONVENTION.md` before naming or structuring new code.
5. Read the relevant screen specification in `../web-design-repository/` before implementing a screen or interaction.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`

Run lint and build before finishing.

## Stack and structure

- React 19 + Vite
- react-router-dom v7, TanStack Query v5, Zustand, axios
- Route pages: `src/pages/`; reusable UI: `src/components/`; API clients: `src/api/`; stores: `src/stores/`; hooks: `src/hooks/`.
- Components use PascalCase; functions and variables use camelCase.
- API calls go through `src/api/`. Do not call `fetch` directly from components.
- Server data is managed with TanStack Query; client-only shared state uses Zustand.
- Use existing design tokens and preserve light mode, dark mode, desktop, and mobile behavior.

## Contract and service rules

- Base URL comes from `VITE_API_BASE_URL`.
- Protected requests send `Authorization: Bearer <accessToken>` through the shared axios instance.
- Unwrap the shared `{success,data}` / `{success,error}` envelope in one common location.
- IDs from the API are strings.
- Do not invent room owners, admins, roles, 1:1-only flows, or group-only flows. All room members are equal.

## Security

- Do not edit `.env` or add secrets to source, issues, PRs, fixtures, screenshots, or logs.
- Do not store or pass tokens in URL query strings.
- New packages require team confirmation before installation.

## Collaboration

- One issue = one branch = one focused PR. Never work directly on `main`.
- Branches: `feat/<issue>-<topic>`, `fix/<issue>-<topic>`, or `chore/<topic>`.
- Commits and PR titles use Conventional Commits, for example `feat: connect login API (#3)`.
- Keep unrelated local changes out of the PR.
- Contract changes require leader approval in the SSOT repository before implementation.

## Completion report

Report changed files, lint/build results, and any remaining blocker in three short bullets.
