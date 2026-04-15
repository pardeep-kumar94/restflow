# Restflow

Visual API workflow builder. See [README.md](README.md) for project overview.

## Dev Setup

```bash
npm install
npm run dev
```

## Architecture

- Next.js App Router with React 19 + TypeScript
- Zustand for state management (`src/stores/workflow-store.ts`)
- Tailwind CSS 4 for styling
- All API execution happens client-side via `/api/proxy` CORS proxy
