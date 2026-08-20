# open-agent-engine

> Cross-platform multi-agent scaffolding, skill package manager, and transpiler engine

## 1. Quick Start & Shell Commands
Run commands using native shell syntax:
- Build: `pnpm build`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Dev: `pnpm dev`

## 5. Operational Invariants
- **ALWAYS**: Run verification tests (`pnpm test`) before submitting code changes.
- **ALWAYS**: Keep generated instruction files context-lean and modular.
- **NEVER**: Commit untested platform adapters or breaking schema changes.
