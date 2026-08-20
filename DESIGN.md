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

### C. Educational Guided Tour (`agent-engine tour`)
```
  ◆  Open Agent Engine: Interactive Mental Model Tour
  │
  ◇  Step 1/4: The Monolith Trap vs. Canonical Architecture
  │  Traditional: 2,000-line .cursorrules -> 3,500 tokens/turn ($$$ + cache miss)
  │  Agent Engine: .agents/ canonical core -> 320 tokens/turn (90% savings)
  │
  ◇  Step 2/4: 3-Level Progressive Disclosure
  │  ├── Level 1: Frontmatter Index (~100 tokens active context)
  │  ├── Level 2: SKILL.md Body (~500 tokens on-demand only)
  │  └── Level 3: External scripts & assets (0 tokens active context)
  │
  ◇  Step 3/4: Zero-Loss Multi-Platform Transpilation
  │  Compiles one AST to Claude, Cursor, Windsurf, Roo, Aider, & AAIF.
  │
  ◇  Step 4/4: Safe Subagent Worktree Isolation
  │  Subagents edit ephemeral .worktrees/task-*, never dirtying git main.
  │
  ✔  Tour complete! Run 'agent-engine explain <concept>' for deep dives.
```

### D. Concept Explainer (`agent-engine explain progressive-disclosure`)
```
  ◆  Concept: 3-Level Progressive Disclosure
  │
  ├─ Level 1 (Metadata Index)   : ~100 tokens (Always active in system prompt)
  ├─ Level 2 (Workflow Runbook) : ~500 tokens (Loaded ONLY on matching trigger)
  └─ Level 3 (Execution Assets) : 0 context tokens (Executed via CLI / disk)
  │
  💡 Token Economics Impact:
     • Turn Cost    : 3,500 tokens -> 320 tokens (90% reduction)
     • Cache Hit Rate: 18% -> 96% (>4x faster response latency)
```

### E. Pedagogical Diagnostic Linter (`agent-engine doctor --explain`)
```
  ◆  Scanning workspace against architectural best practices...
  │
  ▲  Rule 'typescript-invariants' is 182 lines (target: <150 lines).
  │  💡 Why this matters: Monolithic rules invalidate LLM prompt prefix caching,
  │     costing ~300ms latency per request and degrading model reasoning focus.
  │  👉 Recommendation: Split into 'typescript-types' and 'typescript-imports'.
  │
  ✔  Found 1 pedagogical recommendation. Canonical AST is healthy.
```
