export interface SkillTemplateOptions {
  name?: string;
  description?: string;
  version?: string;
  entrypoint?: string;
}

/**
 * Generates workspace skill markdown template (.agents/skills/workspace-init/SKILL.md).
 */
export function generateSkillTemplate(options: SkillTemplateOptions = {}): string {
  const name = options.name || 'workspace-init';
  const description =
    options.description || 'Initialize and verify new workspace repositories and agent scaffolding.';
  const version = options.version || '1.0.0';
  const entrypoint = options.entrypoint || 'SKILL.md';

  return `---
name: ${name}
description: ${description}
version: ${version}
entrypoint: ${entrypoint}
---

# Workspace Initialization Protocol

This skill provides step-by-step guidance for setting up and bootstrapping an agent-ready development workspace.

## Execution Steps

1. **Verify Environment Prerequisites**
   - Check Node.js runtime version (\`node -v >= 18.0.0\`).
   - Detect preferred package manager (\`pnpm\`, \`npm\`, \`yarn\`, \`bun\`).

2. **Inspect Project Structure**
   - Read \`.agents/config.yaml\` for active targets and path configurations.
   - Ensure all declared personas, rules, and skills are present on disk.

3. **Compile Native IDE Configurations**
   - Run \`agent-engine build\` to generate target adapter configs.
   - Verify generated files (\`CLAUDE.md\`, \`.cursor/rules/\`, \`AGENTS.md\`, etc.).

4. **Run Smoke Tests**
   - Execute package test runner to ensure environment sanity.
`;
}
