import type { CanonicalTarget, AgentsProjectAST } from 'open-agent-engine-core';
import { BaseAdapter } from './base.js';
import type {
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
} from './types.js';
import { stringifyFrontmatter } from './utils.js';

export class CursorAdapter extends BaseAdapter {
  public readonly target: CanonicalTarget = 'cursor';
  public readonly name = 'Cursor MDC Adapter';
  public readonly description =
    'Generates modular .cursor/rules/*.mdc rule files with frontmatter globs and alwaysApply';

  public compile(
    projectInput: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] {
    const project = this.normalizeProject(projectInput);
    const files: CompiledFile[] = [];

    // 1. Generate 000-project.mdc overview rule
    const overviewContent = this.generateProjectOverviewMdc(project);
    files.push({
      path: '.cursor/rules/000-project.mdc',
      content: overviewContent,
      description: 'Cursor master project overview and architectural context',
    });

    // 2. Generate rule-specific .cursor/rules/<rule.id>.mdc
    for (const rule of project.rules) {
      const ruleMdc = this.generateRuleMdc(rule);
      files.push({
        path: `.cursor/rules/${rule.id}.mdc`,
        content: ruleMdc,
        description: `Cursor rule MDC for ${rule.id}`,
      });
    }

    // 3. Generate persona-specific .cursor/rules/persona-<persona.id>.mdc
    for (const persona of project.personas) {
      const personaMdc = this.generatePersonaMdc(persona);
      files.push({
        path: `.cursor/rules/persona-${persona.id}.mdc`,
        content: personaMdc,
        description: `Cursor persona rule MDC for ${persona.name}`,
      });
    }

    return files;
  }

  private generateProjectOverviewMdc(project: ResolvedAgentsProject): string {
    const frontmatter: Record<string, unknown> = {
      description: `Project architectural overview, shell commands, and agent guidelines for ${project.config.project?.name || 'Workspace'}`,
      globs: '',
      alwaysApply: true,
    };

    const lines: string[] = [];
    const projectName = project.config.project?.name || 'Agent Workspace';
    const projectDesc =
      project.config.project?.description ||
      'AI-assisted software development workspace';

    lines.push(`# ${projectName} Architectural Guidelines`);
    lines.push('');
    lines.push(`> ${projectDesc}`);
    lines.push('');

    // Environment & Shell Commands
    lines.push('## Shell Commands');
    lines.push('- Build: `pnpm build`');
    lines.push('- Test: `pnpm test`');
    lines.push('- Typecheck: `pnpm typecheck`');
    lines.push('- Dev: `pnpm dev`');
    lines.push('');

    // Active Fleet
    if (project.personas.length > 0) {
      lines.push('## Active Subagent Personas');
      for (const p of project.personas) {
        lines.push(`- **${p.name}** (\`${p.id}\`): ${p.description || 'Specialized agent.'}`);
      }
      lines.push('');
    }

    // Core Rules Summary
    if (project.rules.length > 0) {
      lines.push('## Architectural Rule Index');
      for (const r of project.rules) {
        const globStr = r.scope?.globs?.length ? ` [${r.scope.globs.join(', ')}]` : '';
        lines.push(`- **${r.id}**${globStr}: ${r.description || 'Rule definition.'}`);
      }
      lines.push('');
    }

    // Operational Boundaries
    lines.push('## Operational Boundaries');
    lines.push('- Always execute tests and type verification before committing code changes.');
    lines.push('- Adhere to modular boundary contracts across packages.');
    lines.push('');

    return stringifyFrontmatter(frontmatter, lines.join('\n'));
  }

  private generateRuleMdc(rule: ResolvedAgentsProject['rules'][0]): string {
    const globsValue =
      rule.scope?.globs && rule.scope.globs.length > 0
        ? rule.scope.globs.join(', ')
        : '';

    const frontmatter: Record<string, unknown> = {
      description: rule.description || `Rule ${rule.id}`,
      globs: globsValue,
      alwaysApply: rule.scope?.always_apply ?? false,
    };

    const lines: string[] = [];
    lines.push(`# Rule: ${rule.id}`);
    lines.push('');
    if (rule.description) {
      lines.push(`> ${rule.description}`);
      lines.push('');
    }
    lines.push(rule.content.trim());
    lines.push('');

    return stringifyFrontmatter(frontmatter, lines.join('\n'));
  }

  private generatePersonaMdc(persona: ResolvedAgentsProject['personas'][0]): string {
    const frontmatter: Record<string, unknown> = {
      description: `Persona instructions for ${persona.name} (${persona.id})`,
      globs: '',
      alwaysApply: false,
    };

    const lines: string[] = [];
    lines.push(`# Persona: ${persona.name}`);
    lines.push('');
    lines.push(persona.system_prompt.trim());
    lines.push('');

    if (persona.skills && persona.skills.length > 0) {
      lines.push(`## Associated Skills: ${persona.skills.join(', ')}`);
      lines.push('');
    }

    return stringifyFrontmatter(frontmatter, lines.join('\n'));
  }
}
