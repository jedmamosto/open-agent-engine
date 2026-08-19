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

All canonical schemas are defined using Zod in [`packages/core/src/schema/`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/schema/).

### A. Persona Definition (`.agents/personas/<id>.yaml`)
Implemented by [`PersonaSchema`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/schema/persona.ts#L17-L28).

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
Implemented by [`RuleSchema`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/schema/rule.ts#L10-L18).

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
Implemented by [`HookSchema`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/schema/hook.ts#L16-L25).

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

### D. Skill Frontmatter (`.agents/skills/<name>/SKILL.md`)
Implemented by [`SkillFrontmatterSchema`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/schema/skill.ts#L3-L9).

```markdown
---
name: behavioral-tdd
description: Test-driven behavioral verification protocol with Vitest and Playwright.
version: 1.0.0
entrypoint: scripts/run-suite.sh
---

# Behavioral TDD Protocol
...
```

### E. Configuration Definition (`.agents/config.yaml`)
Implemented by [`ConfigSchema`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/schema/config.ts#L74-L86).

```yaml
version: 1.0.0
project:
  name: open-agent-engine
  description: Open multi-agent transpilation engine
  authors:
    - Open Agent Team
targets:
  - claude
  - cursor
  - windsurf
  - roo
  - aider
  - aaif
paths:
  personas: .agents/personas
  rules: .agents/rules
  skills: .agents/skills
  hooks: .agents/hooks
registry:
  skills:
    - handoff
    - behavioral-tdd
```

---

## 3. Core Parsing & Validation Engine (`@agent-engine/core`)

The parser and validation engine resides in [`packages/core/src/parser/`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/).

### A. YAML & Frontmatter Parser
- [`parseYaml`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/yaml.ts#L48-L101): Parses YAML strings, returning data or a structured [`YamlDiagnostic`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/yaml.ts#L4-L9) containing line number, column, and snippet markers.
- [`parseYamlOrThrow`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/yaml.ts#L106-L120): Throws [`YamlParseError`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/yaml.ts#L11-L23) with contextual source diagnostics on failure.
- [`parseFrontmatter`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/yaml.ts#L132-L172): Strips UTF-8 BOM, extracts leading YAML blocks across CRLF/LF line endings, and separates Markdown body content from metadata.

### B. Validation & Integrity Checker
- **Entity-Level Validators**: [`validatePersona`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L86-L97), [`validateRule`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L99-L134), [`validateHook`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L136-L147), [`validateSkillFrontmatter`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L149-L160), and [`validateConfig`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L162-L169).
- **Glob Syntax Validation**: [`isValidGlob`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L40-L69) ensures rule scope patterns avoid mismatched brackets or braces.
- **Cross-Entity AST Validation**: [`validateAgentsProject`](file:///c:/Users/ASUS/Documents/VSCode/open-agent-engine/.worktrees/eng-101-core-schemas/packages/core/src/parser/validator.ts#L174-L349) verifies:
  1. Uniqueness of persona, rule, hook, and skill identifiers across the workspace.
  2. Persona-to-skill referential integrity: ensures all skill names referenced by personas exist either in local skills, `config.skills`, or `config.registry.skills`.

---

## 4. Skill Package Management Protocol

### Registry Resolution Order
1. **Local Skill**: `.agents/skills/<name>/SKILL.md` (Local custom override)
2. **Community Registry Index**: `https://registry.agent-engine.dev/skills/<name>.json`
3. **GitHub / Git URL**: `github:owner/repo#path-to-skill` or `https://github.com/...`
4. **Direct URL**: `https://.../SKILL.md`

### 3-Level Progressive Disclosure
- **Level 1**: Metadata in `SKILL.md` frontmatter (indexed in parent context).
- **Level 2**: Core execution workflow in `SKILL.md` body (loaded upon trigger).
- **Level 3**: Auxiliary assets in `scripts/`, `references/`, `templates/` (loaded only on explicit file view).
