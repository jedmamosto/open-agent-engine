# Design Specification: CLI Visual Identity & Terminal UX

## 1. Design Language & Aesthetics
`agent-engine` CLI follows a modern, crisp terminal design language inspired by clean developer tooling (`pnpm`, `vite`, `turborepo`, `shadcn`).

### Principles
- **High Signal, Zero Slop**: Clean layout, structured tables, and readable status trees. No decorative ASCII spam.
- **Semantic Color Tokens**:
  - `Brand Primary`: Cyan / Vibrant Teal (`#06b6d4` / ANSI cyan) — Represents orchestration and flow.
  - `Success`: Emerald Green (`#10b981` / ANSI green) — Validations and passed build targets.
  - `Warning / Gating`: Amber (`#f59e0b` / ANSI yellow) — Worktree notices and diff alerts.
  - `Error / Mutation Denial`: Coral Red (`#ef4444` / ANSI red) — Schema rejections and pre-tool hook blocks.
  - `Subtle / Context`: Muted Gray (`#6b7280` / ANSI gray) — File paths, execution timings, and hints.

---

## 2. Interactive CLI UX Flows

### A. Initialization Wizard (`npx agent-engine init`)
```
  ◆  Open Agent Engine  v0.1.0
  │
  ◇  Select your target AI coding environments:
  │  ● Claude Code
  │  ● Cursor (.cursor/rules)
  │  ○ Windsurf
  │  ● Roo Code / Cline
  │  ● Linux Foundation (AGENTS.md)
  │
  ◇  Select initial subagent fleet:
  │  ● Full 9-Agent Canonical Fleet (Recommended)
  │  ○ Minimal Triad (Architect, Implementer, Reviewer)
  │  ○ Custom Selection
  │
  ◇  Select initial skills to install:
  │  ◼ handoff (Session snapshot & context continuity)
  │  ◼ impeccable (Frontend design craft & anti-slop)
  │  ◻ wayfinder (Decision mapping)
  │
  ✔  Scaffolded .agents/ canonical core!
  ✔  Compiled 4 target adapters in 142ms.
```

### B. Transpiler Build Output (`agent-engine build`)
```
  ◆  Building agent targets from .agents/ ...
  │
  ├─ ✔ Claude Code      -> CLAUDE.md, .claude/agents (9), .claude/skills (2)
  ├─ ✔ Cursor           -> .cursor/rules/*.mdc (11 rules, 9 personas)
  ├─ ✔ Roo Code         -> .roomodes (9 custom modes), .clinerules
  └─ ✔ Universal AAIF   -> AGENTS.md (98 lines)
  │
  ✔  Done in 84ms. All targets synchronized and verified.
```
