# Restflow

Visual API workflow builder for modern APIs. Import OpenAPI specs, drag endpoints onto a canvas, connect them, map data between responses and requests, and execute multi-step API workflows — all in your browser.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Visual Canvas** — Drag-and-drop endpoints onto an infinite, pannable canvas
- **OpenAPI Import** — Paste a Swagger/OpenAPI URL and all endpoints are parsed instantly (2.0 & 3.x)
- **Data Mapping** — Wire response fields from one step into request parameters of the next using JSON Path
- **Stage Execution** — Run workflows step-by-step with real-time status, timing, and response previews
- **Section Grouping** — Organize endpoints into logical groups on the canvas
- **100% Client-Side** — No backend, no sign-up. All data stays in your browser via localStorage

## Tech Stack

- Next.js, React 19, TypeScript
- Zustand (state management)
- Tailwind CSS 4
- Monaco Editor (inline code editing)
- `@apidevtools/swagger-parser` (OpenAPI parsing with $ref resolution)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/restflow.git
cd restflow

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page, or go to [http://localhost:3000/app](http://localhost:3000/app) to start building workflows.

## How It Works

1. **Import** — Paste an OpenAPI/Swagger spec URL
2. **Build** — Drag endpoints onto the canvas and connect them
3. **Map** — Wire response data from one step into the next step's parameters
4. **Execute** — Run the workflow stage-by-stage and inspect results

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Landing page
│   ├── app/page.tsx      # Main application shell
│   └── api/proxy/        # CORS proxy for API calls
├── components/           # React components
│   ├── api-explorer/     # API spec browsing
│   ├── workflow/         # Canvas & node visualization
│   ├── execution/        # Execution UI
│   ├── step-editor/      # Request configuration
│   ├── response/         # Response viewer
│   └── common/           # Shared UI components
├── lib/                  # Core logic
│   ├── parser.ts         # OpenAPI parser
│   ├── executor.ts       # HTTP request executor
│   ├── stage-executor.ts # Stage-based workflow runner
│   ├── variable.ts       # JSON Path & variable substitution
│   └── graph-utils.ts    # Workflow graph utilities
├── stores/
│   └── workflow-store.ts # Zustand state store
└── types/
    └── index.ts          # TypeScript interfaces
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
