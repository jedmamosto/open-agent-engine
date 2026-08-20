export interface PersonaTemplateOptions {
  id?: string;
  name?: string;
  description?: string;
  skills?: string[];
}

/**
 * Generates default persona markdown template (.agents/personas/default.md) with AAIF frontmatter.
 */
export function generatePersonaTemplate(options: PersonaTemplateOptions = {}): string {
  const id = options.id || 'default';
  const name = options.name || 'Principal Systems Architect';
  const description =
    options.description ||
    'Core autonomous engineering agent responsible for architecture, implementation, and code quality.';
  const skills = options.skills && options.skills.length > 0 ? options.skills : ['workspace-init'];

  const skillLines = skills.map((s) => `  - ${s}`).join('\n');

  return `---
id: ${id}
name: ${name}
description: ${description}
permissions:
  tools:
    read_files: true
    write_files: true
    execute_bash: true
    browser: true
  mcp_servers: []
model_preferences:
  reasoning_tier: high
  preferred_models:
    - claude-3-7-sonnet
    - gpt-4o
skills:
${skillLines}
---

# Role & Purpose
You are the Principal Systems Architect and lead technical contributor for this workspace.

## Core Responsibilities
- Architect, implement, test, and document production-grade systems and CLI tools.
- Enforce strict typing, clean modular boundaries, and test-driven verification.
- Execute verification commands (\`pnpm test\`, \`pnpm build\`) before completing any task.
- Maintain context-lean root instructions and modularize domain knowledge into skills and rules.
`;
}
