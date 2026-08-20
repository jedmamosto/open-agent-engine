# Product Specification: Open Multi-Agent Engine (`agent-engine`)

## 1. Executive Summary & Vision
`agent-engine` is an open-source, vendor-neutral CLI and transpilation framework that unifies AI agent configurations across modern IDEs and CLI tools (Claude Code, Cursor, Windsurf, Roo Code/Cline, Aider, Goose, and OpenAI Agents SDK). 

It allows engineering teams to maintain a **Single Canonical Core** (`.agents/`) with modular personas, 3-level progressive disclosure skills, architectural rules, and deterministic lifecycle hooks, automatically compiling down to 100% native configurations for every supported target environment.

---

## 2. Core Personas & Problem Space
1. **Tech Leads & Staff Engineers**: Tired of maintaining separate `.cursorrules`, `CLAUDE.md`, and `.windsurfrules` that constantly drift and bloat context windows.
2. **Open-Source Maintainers**: Want contributors to get identical AI coding guardrails regardless of which AI assistant or IDE they use.
3. **AI Application Developers**: Need a standard package manager to create, install, and share multi-agent skills (`npx agent-engine add skill <name>`).

---

## 3. Product Pillar Requirements

### Pillar 1: Scaffolding & Initialization Wizard (`npx agent-engine init`)
- Interactive CLI wizard detecting project stack (Next.js, Vite, Fastify, Monorepo, Python).
- Generates canonical `.agents/` workspace structure with standard 9-role fleet or custom configuration.
- Installs base rules, design token schemas, and initial skill bindings.

### Pillar 2: Cross-Platform Adapter Compiler (`agent-engine build`)
- Compiles `.agents/` into:
  - **Claude Code**: `CLAUDE.md`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/settings.json`.
  - **Cursor**: `.cursor/rules/*.mdc` with intelligent `globs` and `alwaysApply` frontmatter.
  - **Windsurf**: `.windsurfrules`, `.windsurf/rules/*.md`.
  - **Roo Code / Cline**: `.roomodes`, `.clinerules`, `.roo/rules-{slug}/`, `.roo/mcp.json`.
  - **Aider**: `.aider.conf.yml`.
  - **AAIF Standard**: `AGENTS.md` root and nested sub-packages.

### Pillar 3: Skill Package Manager (`agent-engine add / create / update skill`)
- **Local Authorship**: Scaffold custom 3-level progressive disclosure skills.
- **Registry & Git Installs**: Direct download of verified community skills or git repositories into `.agents/skills/<name>/`.
- **Local Ownership**: Downloaded skills live as plain Markdown/scripts in the repo, allowing user edits.
- **3-Way Merging**: Update skills with diff previews without overwriting local custom modifications.

### Pillar 4: Git Worktree Multi-Agent Runner (`agent-engine spawn`)
- Spawns isolated Git worktrees (`.worktrees/task-<id>/`) for concurrent subagent execution.
- Prevents branch collisions and working tree dirty state.
- Automated merge gating with test/typecheck verification.

### Pillar 5: Developer Education & In-Situ Pedagogical Runtime
- **Interactive Mental Model Tour (`agent-engine tour`)**: Terminal walkthrough teaching the paradigm shift from cowboy prompt dumping to progressive disclosure and canonical architecture.
- **Visual Concept Explainer (`agent-engine explain <concept>`)**: On-demand CLI visualizations detailing progressive disclosure token savings, AST compilation flows, and Git worktree isolation.
- **Pedagogical Diagnostic Linter (`agent-engine doctor --explain`)**: Scans workspace rules and explains the architectural rationale behind every constraint (e.g., prompt prefix cache invalidation on rules exceeding 150 lines).
- **Interactive Sandbox & Katas (`init --template=interactive-tutorial`)**: Guided hands-on refactoring exercises for engineering teams.

