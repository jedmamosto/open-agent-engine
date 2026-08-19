# Technical Architecture Specification: Open Multi-Agent Engine

## 1. System Topology & Data Flow

```mermaid
graph TD
    subgraph Storage [1. Canonical Storage (.agents/)]
        Config[config.yaml]
        Personas[personas/*.yaml]
        Skills[skills/*/SKILL.md]
        Rules[rules/*.yaml]
        Hooks[hooks/*.yaml]
    end

    subgraph Core [2. Core Parser & Validator (@agent-engine/core)]
        Parser[YAML / Frontmatter Parser]
        ZodValidator[Zod Schema Validator]
        DepGraph[Skill Dependency & Anchor Resolver]
    end

    subgraph Adapters [3. Target Adapters (@agent-engine/cli)]
        ClaudeAdapter[Claude Code Adapter]
        CursorAdapter[Cursor MDC Adapter]
        WindsurfAdapter[Windsurf Adapter]
        RooAdapter[Roo Code Adapter]
        AiderAdapter[Aider Adapter]
        AAIFAdapter[AAIF AGENTS.md Adapter]
    end

    subgraph Output [4. Native Target Files]
        ClaudeOut[CLAUDE.md + .claude/]
        CursorOut[.cursor/rules/*.mdc]
        WindsurfOut[.windsurfrules + .windsurf/]
        RooOut[.roomodes + .clinerules]
        AiderOut[.aider.conf.yml]
        AAIFOut[AGENTS.md]
    end

    Storage --> Parser
    Parser --> ZodValidator
    ZodValidator --> DepGraph
    DepGraph --> ClaudeAdapter & CursorAdapter & WindsurfAdapter & RooAdapter & AiderAdapter & AAIFAdapter
    ClaudeAdapter --> ClaudeOut
    CursorAdapter --> CursorOut
    WindsurfAdapter --> WindsurfOut
    RooAdapter --> RooOut
    AiderAdapter --> AiderOut
    AAIFAdapter --> AAIFOut
```

---

## 2. Canonical Schema Specifications

### A. Persona Definition (`.agents/personas/<id>.yaml`)
```yaml
id: qa-behavioral-architect
name: QA Behavioral Architect
description: Autonomous TDD architect, behavioral test suite implementer, and regression breaker.
system_prompt: |
  You are a Staff QA Behavioral Architect with 12+ years of experience specializing in TDD, 
  Playwright e2e suites, and Vitest unit coverage.
permissions:
  tools:
    read_files: true
    write_files: true
    execute_bash: true
    browser: true
  mcp_servers:
    - playwright
model_preferences:
  reasoning_tier: high
  preferred_models:
    - claude-3-7-sonnet
    - gpt-4o
skills:
  - handoff
  - behavioral-tdd
```

### B. Rule Definition (`.agents/rules/<id>.yaml`)
```yaml
id: typescript-invariants
description: Strict TypeScript standards and module boundaries
scope:
  globs:
    - "src/**/*.ts"
    - "packages/**/*.ts"
  always_apply: false
content: |
  - Enforce explicit return types on all exported functions.
  - Prohibit `any`; use `unknown` with type narrowing.
  - Prefer immutable data structures (`Readonly<T>`).
```

### C. Hook Definition (`.agents/hooks/<id>.yaml`)
```yaml
id: pre-tool-safety-guard
event: PreToolUse
target_tools:
  - Bash
  - terminal_execute
rules:
  - pattern: "rm -rf /"
    action: deny
    message: "Destructive root filesystem deletion blocked."
  - pattern: "git push --force"
    action: deny
    message: "Force push prohibited on main branch."
fallback_action: allow
```

---

## 3. Skill Package Management Protocol

### Registry Resolution Order
1. **Local Skill**: `.agents/skills/<name>/SKILL.md` (Local custom override)
2. **Community Registry Index**: `https://registry.agent-engine.dev/skills/<name>.json`
3. **GitHub / Git URL**: `github:owner/repo#path-to-skill` or `https://github.com/...`
4. **Direct URL**: `https://.../SKILL.md`

### 3-Level Progressive Disclosure
- **Level 1**: Metadata in `SKILL.md` frontmatter (indexed in parent context).
- **Level 2**: Core execution workflow in `SKILL.md` body (loaded upon trigger).
- **Level 3**: Auxiliary assets in `scripts/`, `references/`, `templates/` (loaded only on explicit file view).
