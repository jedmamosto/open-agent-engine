import YAML from 'yaml';
import { SkillFrontmatterSchema, type SkillFrontmatter } from '../core/index.js';

export interface TemplateGenerateOptions {
  name: string;
  description?: string;
  version?: string;
  entrypoint?: string;
  compatibility?: string[] | string | Record<string, unknown>;
  template?: 'progressive' | 'standard' | 'minimal';
  body?: string;
}

export function generateSkillMarkdown(options: TemplateGenerateOptions): {
  frontmatter: SkillFrontmatter;
  content: string;
} {
  const frontmatter: SkillFrontmatter = {
    name: options.name,
    description: options.description || `Custom skill: ${options.name}`,
    version: options.version || '1.0.0',
    entrypoint: options.entrypoint,
    compatibility: options.compatibility || [
      'claude-code',
      'cursor',
      'windsurf',
      'roo-code',
      'aider',
      'aaif-agents-md',
    ],
  };

  // Validate frontmatter structure
  SkillFrontmatterSchema.parse(frontmatter);

  const cleanFrontmatter: Record<string, unknown> = {
    name: frontmatter.name,
    description: frontmatter.description,
    version: frontmatter.version,
  };

  if (frontmatter.entrypoint) {
    cleanFrontmatter.entrypoint = frontmatter.entrypoint;
  }
  if (frontmatter.compatibility) {
    cleanFrontmatter.compatibility = frontmatter.compatibility;
  }

  const yamlStr = YAML.stringify(cleanFrontmatter, { indent: 2 }).trim();

  let body = options.body;
  if (!body) {
    const templateType = options.template || 'progressive';
    switch (templateType) {
      case 'minimal':
        body = `# Skill: ${options.name}

${options.description || 'Custom capability documentation and instructions.'}
`;
        break;

      case 'standard':
        body = `# Skill: ${options.name}

> ${options.description || 'Custom capability documentation and instructions.'}

## Overview
Describe what this skill enables subagents and developers to achieve.

## Instructions & Workflows
1. Step-by-step workflow requirements.
2. Guidelines and constraints.

## Invariants
- ALWAYS verify results before concluding tasks.
- NEVER perform unverified destructive changes.
`;
        break;

      case 'progressive':
      default:
        body = `# Skill: ${options.name}

> ${options.description || '3-level progressive disclosure skill definition.'}

## Level 1: Overview & Trigger Conditions
Brief summary of capability (< 50 tokens) explaining when this skill should be activated by subagents or orchestrator.

## Level 2: Execution Workflows & Decision Logic
1. **Phase 1 - Discovery**: Inspect relevant workspace context and preconditions.
2. **Phase 2 - Execution**: Apply specialized heuristics and tool invocations.
3. **Phase 3 - Verification**: Validate outcomes against repository quality gates.

## Level 3: Rules, Schemas & Reference
- **Deterministic Rules**: Mandatory constraints and anti-patterns to avoid.
- **Reference Scripts**: Specify entrypoint script or external tooling contracts if applicable.
`;
        break;
    }
  }

  const content = `---\n${yamlStr}\n---\n\n${body.trim()}\n`;

  return {
    frontmatter,
    content,
  };
}
