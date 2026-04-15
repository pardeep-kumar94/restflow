# Contributing to Restflow

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
npm install
npm run dev
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run lint` to check for issues
4. Run `npm run build` to verify the build passes
5. Open a pull request

## Code Style

- TypeScript strict mode is enabled
- Use the existing patterns in the codebase
- Keep components focused — one responsibility per file
- Use Zustand for shared state, local state for component-only concerns

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
