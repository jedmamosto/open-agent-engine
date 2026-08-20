# Active Sprint Backlog & Roadmap

## 1. Active Sprint Tickets (Sprint 1: Core Engine & Adapters)

| Ticket ID | Type | Priority | Status | Lock Paths | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ENG-101` | `[Core]` | `P0` | `[DONE]` | `packages/core/src/schema/**`, `packages/core/src/parser/**` | Zod schemas for Personas, Rules, Skills, Hooks, Config & validation engine with 100% test coverage. |
| `ENG-102` | `[CLI]` | `P0` | `[DONE]` | `packages/cli/src/commands/build.ts`, `packages/cli/src/adapters/**` | Transpiler adapters for Claude Code, Cursor, Roo Code, and AAIF `AGENTS.md`. |
| `ENG-103` | `[CLI]` | `P0` | `[TODO]` | `packages/cli/src/commands/init.ts` | Interactive scaffolding wizard with prompts, template extraction, and auto-build. |
| `ENG-104` | `[SkillHub]` | `P1` | `[TODO]` | `packages/cli/src/commands/skill.ts` | `agent-engine add skill`, `create skill`, `update skill` registry and git installer. |
| `ENG-105` | `[Core]` | `P1` | `[TODO]` | `packages/core/src/worktree/**` | Git worktree isolation spawner and clean teardown automation. |

---

## 2. Product Epics & Architecture Milestones

### Epic 1: Canonical AST Schema & Validation Engine (`@agent-engine/core`)
- Strict type-safe definitions for Personas, Rules, Skills, and Hooks.
- Custom validator catching frontmatter syntax traps, missing skills, and circular dependencies.

### Epic 2: Multi-Platform Adapter Pipeline (`@agent-engine/cli`)
- Zero-loss compilation into Claude Code, Cursor `.mdc`, Windsurf, Roo Code, Aider, and Linux Foundation `AGENTS.md`.
- Snapshot testing suite verifying generated configs against real IDE parsers.

### Epic 3: Community Skill Hub & Package Manager
- Decentralized skill registry resolution (official index + GitHub repo + direct URL).
- 3-way merge conflict detection for skill updates.

### Epic 4: Ephemeral Git Worktree Orchestrator
- Windows-hardened `.worktrees/task-<id>` spawner with git index lock detection.
- Deterministic test gate verification and branch teardown.

### Epic 5: Live Antigravity & Local System Sync (`@agent-engine/sync` / `agent-engine sync`)
- **Objective**: Maintain real-time or on-demand alignment between the developer's active Antigravity platform (`~/.gemini/antigravity/`, `~/.gemini/config/skills/`, `~/.gemini/config/agents/`) and the `open-agent-engine` repository.
- **Key Capabilities**:
  - `agent-engine sync --pull`: Import newly evolved skills, hooks, and orchestrator personas from the active local Antigravity runtime into `.agents/` canonical core.
  - `agent-engine sync --push`: Export compiled open-agent-engine configurations and custom skills back into local Antigravity stores and target IDE configs.
  - **Drift & Semantic Diff Detection**: Detect when the open-source repository falls behind active local workflows or vice versa, offering interactive 3-way merge resolution.
  - **Selective Masking**: Ensure local private tokens/paths are sanitized during sync.

