export interface RuleTemplateOptions {
  id?: string;
  description?: string;
  globs?: string[];
  alwaysApply?: boolean;
}

/**
 * Generates foundational rule markdown template (.agents/rules/000-base.md) strictly <150 lines.
 */
export function generateRuleTemplate(options: RuleTemplateOptions = {}): string {
  const id = options.id || '000-base';
  const description =
    options.description ||
    'Foundational engineering invariants, test-driven rigor, and progressive disclosure rules.';
  const globs = options.globs && options.globs.length > 0 ? options.globs : ['**/*'];
  const alwaysApply = options.alwaysApply !== undefined ? options.alwaysApply : true;

  const globLines = globs.map((g) => `    - "${g}"`).join('\n');

  return `---
id: ${id}
description: ${description}
scope:
  globs:
${globLines}
  always_apply: ${alwaysApply}
---

# Base Engineering Invariants

## 1. Quality & Verification Gate
- Always run local tests (\`pnpm test\` or equivalent) and typechecks before committing code.
- Never commit broken builds, failing tests, or unverified changes.

## 2. Progressive Disclosure & Context Budget
- Maintain concise, lean root instructions (<150 lines) across all generated targets.
- Modularize complex domain instructions into dedicated subagents, skills, or rules.

## 3. Strict Boundary Contracts
- Keep core schemas vendor-neutral and decoupled from target platform IDE quirks.
- Use explicit types and error narrowing rather than loose any types.

## 4. Cross-Platform Primitives
- Use native platform primitives and robust cross-platform path handling (e.g. forward slashes).
- Preserve existing comments and docstrings when modifying code.
`;
}
