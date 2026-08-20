import type { CanonicalTarget, AgentsProjectAST } from '../core/index.js';
import { BaseAdapter } from './base.js';
import type {
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
} from './types.js';

export class WindsurfAdapter extends BaseAdapter {
  public readonly target: CanonicalTarget = 'windsurf';
  public readonly name = 'Windsurf Adapter';
  public readonly description =
    'Generates .windsurfrules and modular .windsurf/rules/*.md configurations';

  public compile(
    projectInput: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] {
    const project = this.normalizeProject(projectInput);
    const files: CompiledFile[] = [];

    // 1. Generate root .windsurfrules
    const rootRulesContent = this.generateWindsurfrules(project);
    files.push({
      path: '.windsurfrules',
      content: rootRulesContent,
      description: 'Windsurf Cascade root instruction and behavior rules',
    });

    // 2. Generate modular .windsurf/rules/<rule.id>.md
    for (const rule of project.rules) {
      const ruleContent = this.generateRuleFile(rule);
      files.push({
        path: `.windsurf/rules/${rule.id}.md`,
        content: ruleContent,
        description: `Windsurf modular rule specification for ${rule.id}`,
      });
    }

    return files;
  }

  private generateWindsurfrules(project: ResolvedAgentsProject): string {
    const lines: string[] = [];
    const projectName = project.config.project?.name || 'Agent Workspace';
    const projectDesc =
      project.config.project?.description ||
      'AI-assisted software development workspace';

    lines.push(`# ${projectName} - Cascade AI Directives`);
    lines.push('');
    lines.push(`> ${projectDesc}`);
    lines.push('');

    // Environment & Shell
    lines.push('## Environment & Commands');
    lines.push('- Build: `pnpm build`');
    lines.push('- Test: `pnpm test`');
    lines.push('- Typecheck: `pnpm typecheck`');
    lines.push('- Dev: `pnpm dev`');
    lines.push('');

    // Personas
    if (project.personas.length > 0) {
      lines.push('## Active Subagent Roles');
      for (const p of project.personas) {
        lines.push(`- **${p.name}** (\`${p.id}\`): ${p.description || 'Specialized agent.'}`);
      }
      lines.push('');
    }

    // Rules
    if (project.rules.length > 0) {
      lines.push('## Core Architectural Rules');
      for (const r of project.rules) {
        const globStr =
          r.scope?.globs && r.scope.globs.length > 0
            ? ` [Applies to: ${r.scope.globs.join(', ')}]`
            : '';
        lines.push(`### Rule: ${r.id}${globStr}`);
        if (r.description) {
          lines.push(`*${r.description}*`);
        }
        lines.push('');
        lines.push(r.content.trim());
        lines.push('');
      }
    }

    // Operational Invariants
    lines.push('## Operational Boundaries');
    lines.push('- ALWAYS execute tests before submitting diffs.');
    lines.push('- NEVER bypass type validation or delete safety hooks.');
    lines.push('');

    return lines.join('\n');
  }

  private generateRuleFile(rule: ResolvedAgentsProject['rules'][0]): string {
    const lines: string[] = [];
    lines.push(`# Rule: ${rule.id}`);
    lines.push('');
    if (rule.description) {
      lines.push(`**Description**: ${rule.description}`);
      lines.push('');
    }
    if (rule.scope?.globs && rule.scope.globs.length > 0) {
      lines.push(`**Scope Globs**: ${rule.scope.globs.join(', ')}`);
      lines.push('');
    }
    lines.push(`**Always Apply**: ${rule.scope?.always_apply ? 'Yes' : 'No'}`);
    lines.push('');
    lines.push('## Guidelines');
    lines.push('');
    lines.push(rule.content.trim());
    lines.push('');

    return lines.join('\n');
  }
}
