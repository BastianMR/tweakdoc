# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

Local web app that merges a Notion-style editor with a linked spreadsheet to batch-generate personalized PDF documents

## Commands

- Install: `npm install`
- Local database: `npm run db:push` (creates `data/tweakdoc.db`)
- Dev server: `npm run dev` (http://localhost:3000)
- Test: `npm test` (Vitest)
- Lint: `npm run lint` (ESLint)
- Typecheck: `npm run typecheck` (tsc --noEmit)

## Conventions

- Follow existing code style; run the formatter before committing.
- Keep changes minimal and focused on the task at hand.
- Never commit secrets, credentials, or generated artifacts.
- Add user-facing changes under `[Unreleased]` in CHANGELOG.md.
