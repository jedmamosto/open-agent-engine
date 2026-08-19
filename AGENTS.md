# Agent Directives: Open Multi-Agent Engine (`open-agent-engine`)

Open-source, platform-agnostic multi-agent scaffolding, skill package manager, and transpiler engine. Compiles single canonical `.agents/` cores into native Claude Code, Cursor, Windsurf, Roo Code, Aider, and AAIF configurations.

## 1. Context Routing Index
- Active Sprint & Backlog: inspect [agent_docs/backlog.md](file:///C:/Users/ASUS/Documents/VSCode/open-agent-engine/agent_docs/backlog.md)
- Product & Scope: inspect [PRODUCT.md](file:///C:/Users/ASUS/Documents/VSCode/open-agent-engine/PRODUCT.md)
- CLI UX & Design Language: inspect [DESIGN.md](file:///C:/Users/ASUS/Documents/VSCode/open-agent-engine/DESIGN.md)
- Technical Architecture & Compilers: inspect [agent_docs/architecture.md](file:///C:/Users/ASUS/Documents/VSCode/open-agent-engine/agent_docs/architecture.md)
- Subagent Fleet & Protocols: inspect [.agents/subagents.md](file:///C:/Users/ASUS/Documents/VSCode/open-agent-engine/.agents/subagents.md)
- Multi-Agent Orchestration Skill: [subagent-coordinator](file:///C:/Users/ASUS/.gemini/config/skills/subagent-coordinator/SKILL.md)

## 2. Environment & Shell Commands
Execute in PowerShell using strict `;` separator (do NOT use `&&`):
- Install: `pnpm install`
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Dev Mode: `pnpm dev`

## 3. Operational Invariants & Boundaries ("Rule + Why")

### A. ALWAYS Do
1. **Zod Validation on All Manifests**
   - *Why*: User-authored YAML/JSON configs must be validated before transpilation to prevent cryptic compile failures downstream.
   - *Pattern*: `const persona = PersonaSchema.parse(rawYaml);`
2. **Progressive Disclosure in Generated Output**
   - *Why*: Target rule files (e.g. `CLAUDE.md`, `AGENTS.md`) must stay under 150 lines to prevent prompt cache invalidations.
   - *Pattern*: Emitting concise indexes with links to modular docs rather than dumping monolithic codebases.
3. **Sprint-Layered Worktrees & Pruning**
   - *Why*: Subagent worktrees branch from and merge into the active `sprint/<name>` (or `dev`) branch; all background subagent registrations must be pruned from `.git/worktrees/` to keep VS Code clean.

### B. NEVER Do
1. **Never Merge Directly to `main` During Sprints**
   - *Why*: `main` is protected. Individual ticket PRs merge into `sprint/<name>`; merging `sprint/<name>` into `main` requires explicit human VP approval at the end of the sprint.
2. **Never Write Proprietary Logic Inside Core**
   - *Why*: Core schemas must remain 100% platform-agnostic; vendor-specific behaviors belong strictly inside target adapters (`src/adapters/`).
3. **Never Emit Untested Adapters**
   - *Why*: Every adapter must have 100% snapshot/unit test coverage ensuring emitted files match exact target IDE specifications.
4. **Never Mutate User Source Code Directly from Main Orchestrator**
   - *Why*: Maintain strict non-implementation separation; all code changes run via isolated worktree subagents.
