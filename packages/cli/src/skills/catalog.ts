import type { CatalogSkillDefinition } from './types.js';

export const BUILTIN_SKILLS_CATALOG: Record<string, CatalogSkillDefinition> = {
  'workspace-init': {
    name: 'workspace-init',
    description:
      'Automated workspace bootstrap, project stack detection, and canonical .agents/ initialization.',
    version: '1.0.0',
    entrypoint: 'scripts/init.ts',
    compatibility: [
      'claude-code',
      'cursor',
      'windsurf',
      'roo-code',
      'aider',
      'aaif-agents-md',
    ],
    aliases: ['init', 'bootstrap'],
    tags: ['scaffolding', 'bootstrap', 'setup'],
    author: 'agent-engine core team',
    content: `---
name: workspace-init
description: Automated workspace bootstrap, project stack detection, and canonical .agents/ initialization.
version: 1.0.0
entrypoint: scripts/init.ts
compatibility:
  - claude-code
  - cursor
  - windsurf
  - roo-code
  - aider
  - aaif-agents-md
---

# Workspace Initialization Skill

## Level 1: Overview & Intent
Initializes and bootstraps a canonical \`.agents/\` directory inside any repository. Detects project stack (e.g., Node.js, Next.js, Fastify, Python, Go, Rust, Monorepo), configures canonical personas, rules, and hooks, and transpiles native adapter configurations.

## Level 2: Execution Flow & Heuristics
1. **Inspection**: Scan root \`package.json\`, \`pnpm-workspace.yaml\`, \`Cargo.toml\`, \`pyproject.toml\`, or \`go.mod\`.
2. **Scaffolding**: Create standard \`.agents/\` directory tree:
   - \`.agents/config.yaml\`
   - \`.agents/personas/\`
   - \`.agents/rules/\`
   - \`.agents/skills/\`
   - \`.agents/hooks/\`
3. **Transpilation**: Run target transpilers for selected IDEs (Cursor \`.cursor/rules/\`, Claude \`CLAUDE.md\`, Roo \`.roomodes\`, etc.).

## Level 3: Rules & Reference
- Always preserve existing user configuration when re-running initialization.
- Enforce line budget constraints for root index files (CLAUDE.md < 150 lines).
`,
  },

  'subagent-coordinator': {
    name: 'subagent-coordinator',
    description:
      'Orchestrates, gates, and coordinates multiple concurrent subagents across isolated worktrees.',
    version: '1.0.0',
    entrypoint: 'scripts/coordinator.ts',
    compatibility: ['claude-code', 'cursor', 'roo-code', 'aaif-agents-md'],
    aliases: ['coordinator', 'subagent', 'orchestrator'],
    tags: ['orchestration', 'multi-agent', 'worktree'],
    author: 'agent-engine core team',
    content: `---
name: subagent-coordinator
description: Orchestrates, gates, and coordinates multiple concurrent subagents across isolated worktrees.
version: 1.0.0
entrypoint: scripts/coordinator.ts
compatibility:
  - claude-code
  - cursor
  - roo-code
  - aaif-agents-md
---

# Subagent Coordinator Skill

## Level 1: Overview & Intent
Coordinates multi-agent task distribution, assigns isolated Git worktrees, enforces quality gating, and prevents branch collisions during concurrent execution.

## Level 2: Coordination Protocol
1. **Task Decomposition**: Break complex initiatives into independent, single-responsibility sub-tasks.
2. **Worktree Allocation**: Spawn isolated worktree (\`.worktrees/task-<id>/\`) for each agent.
3. **Execution Gating**: Validate that subagents run tests and typechecks before signaling completion.
4. **Handoff & Merge**: Perform three-way merge review into the integration branch.

## Level 3: Invariants & Safety
- Never allow two subagents to mutate the same worktree simultaneously.
- Require 100% test pass rate before approving handoff.
`,
  },

  'antigravity-handoff': {
    name: 'antigravity-handoff',
    description:
      'Context snapshotting and session continuity protocol across agent invocations.',
    version: '1.0.0',
    entrypoint: 'scripts/handoff.ts',
    compatibility: [
      'claude-code',
      'cursor',
      'windsurf',
      'roo-code',
      'aider',
      'aaif-agents-md',
    ],
    aliases: ['handoff', 'session-handoff'],
    tags: ['context', 'session', 'continuity'],
    author: 'agent-engine core team',
    content: `---
name: antigravity-handoff
description: Context snapshotting and session continuity protocol across agent invocations.
version: 1.0.0
entrypoint: scripts/handoff.ts
compatibility:
  - claude-code
  - cursor
  - windsurf
  - roo-code
  - aider
  - aaif-agents-md
---

# Antigravity Handoff Skill

## Level 1: Overview & Intent
Captures structured session snapshots, task completion progress, open decisions, and environment state to ensure seamless context continuity between agent turns or across distinct agent instances.

## Level 2: Handoff Lifecycle
1. **Snapshot Generation**: Write \`.agents/handoffs/HANDOFF_LATEST.md\` containing completed tasks, modified files, test outputs, and pending blockers.
2. **Session Archival**: Archive previous handoff snapshots to \`.agents/handoffs/archive/\` with ISO timestamp format.
3. **Context Resumption**: Ingest latest handoff on initialization to resume execution without redundant discovery.

## Level 3: Template Schema
\`\`\`markdown
# Agent Handoff Snapshot
## 1. Task Summary
## 2. Modified Files & Test Results
## 3. Blockers & Decisions
## 4. Next Steps
\`\`\`
`,
  },

  'code-reviewer': {
    name: 'code-reviewer',
    description:
      'Automated multi-pass code review focusing on correctness, type safety, test coverage, and architectural invariants.',
    version: '1.0.0',
    entrypoint: 'scripts/review.ts',
    compatibility: [
      'claude-code',
      'cursor',
      'windsurf',
      'roo-code',
      'aider',
      'aaif-agents-md',
    ],
    aliases: ['reviewer', 'review', 'code-review'],
    tags: ['quality', 'review', 'testing'],
    author: 'agent-engine core team',
    content: `---
name: code-reviewer
description: Automated multi-pass code review focusing on correctness, type safety, test coverage, and architectural invariants.
version: 1.0.0
entrypoint: scripts/review.ts
compatibility:
  - claude-code
  - cursor
  - windsurf
  - roo-code
  - aider
  - aaif-agents-md
---

# Code Reviewer Skill

## Level 1: Overview & Intent
Performs systematic, multi-pass automated code reviews on Git diffs and pull requests. Enforces strict type safety, boundary validation, test coverage, and repository-specific architectural rules.

## Level 2: Review Passes
1. **Structural & Architecture**: Verify layer boundaries, module dependencies, and single-responsibility principles.
2. **Type Safety & Correctness**: Ensure strict TypeScript types, check for unsafe casts, and handle edge conditions.
3. **Test Verification**: Verify unit tests exist for all new functions, branches, and error cases.
4. **Performance & Cleanliness**: Check for memory leaks, unclosed resources, redundant allocations, and code smells.

## Level 3: Review Checklist & Scoring
- [ ] All tests passing with Vitest / Jest.
- [ ] No regression in target adapters or public CLI interfaces.
- [ ] Descriptive error messages with contextual hints.
`,
  },

  'security-auditor': {
    name: 'security-auditor',
    description:
      'Static vulnerability scanner, secret detector, dependency audit, and permission boundary validator.',
    version: '1.0.0',
    entrypoint: 'scripts/audit.ts',
    compatibility: [
      'claude-code',
      'cursor',
      'windsurf',
      'roo-code',
      'aider',
      'aaif-agents-md',
    ],
    aliases: ['security', 'auditor', 'security-audit'],
    tags: ['security', 'audit', 'compliance'],
    author: 'agent-engine core team',
    content: `---
name: security-auditor
description: Static vulnerability scanner, secret detector, dependency audit, and permission boundary validator.
version: 1.0.0
entrypoint: scripts/audit.ts
compatibility:
  - claude-code
  - cursor
  - windsurf
  - roo-code
  - aider
  - aaif-agents-md
---

# Security Auditor Skill

## Level 1: Overview & Intent
Audits agent configurations, workspace scripts, dependencies, and codebases for security vulnerabilities, hardcoded credentials, malicious hooks, and dangerous tool permissions.

## Level 2: Audit Dimensions
1. **Secret Scanning**: Detect API keys, private certificates, auth tokens, and sensitive env variables in workspace files.
2. **Tool Permission Scoping**: Validate that subagent personas only request minimum necessary tool permissions.
3. **Hook Safety**: Audit pre-tool hooks for prompt injection vulnerabilities and unintended command execution.
4. **Dependency Auditing**: Scan dependencies for known CVEs and untrusted registry sources.

## Level 3: Security Policies
- Never expose private keys or production credentials in \`.agents/\` or committed files.
- Deny automatic shell command execution without user confirmation in high-risk directories.
`,
  },
};

/**
 * Finds a catalog skill by exact name or alias.
 */
export function findCatalogSkill(nameOrAlias: string): CatalogSkillDefinition | undefined {
  const normalized = nameOrAlias.trim().toLowerCase();

  // 1. Direct match
  if (BUILTIN_SKILLS_CATALOG[normalized]) {
    return BUILTIN_SKILLS_CATALOG[normalized];
  }

  // 2. Alias match
  for (const skill of Object.values(BUILTIN_SKILLS_CATALOG)) {
    if (skill.aliases?.some((a) => a.toLowerCase() === normalized)) {
      return skill;
    }
  }

  return undefined;
}

/**
 * Returns list of all available catalog skills.
 */
export function listCatalogSkills(): CatalogSkillDefinition[] {
  return Object.values(BUILTIN_SKILLS_CATALOG);
}
