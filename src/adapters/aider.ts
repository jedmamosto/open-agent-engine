import type { CanonicalTarget, AgentsProjectAST } from '../core/index.js';
import { BaseAdapter } from './base.js';
import type {
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
} from './types.js';
import { stringifyYaml } from './utils.js';

export class AiderAdapter extends BaseAdapter {
  public readonly target: CanonicalTarget = 'aider';
  public readonly name = 'Aider Adapter';
  public readonly description =
    'Generates .aider.conf.yml and .aider.prompt.md project instructions';

  public compile(
    projectInput: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] {
    const project = this.normalizeProject(projectInput);
    const files: CompiledFile[] = [];

    // 1. Generate .aider.conf.yml
    const configYaml = this.generateAiderConfig(project);
    files.push({
      path: '.aider.conf.yml',
      content: configYaml,
      description: 'Aider CLI configuration and automated command bindings',
    });

    // 2. Generate .aider.prompt.md
    const promptMd = this.generateAiderPrompt(project);
    files.push({
      path: '.aider.prompt.md',
      content: promptMd,
      description: 'Aider AI read-only system prompt and project rules',
    });

    return files;
  }

  private generateAiderConfig(project: ResolvedAgentsProject): string {
    // Pick first preferred model from high reasoning tier persona, or fallback
    let preferredModel: string | undefined;
    for (const persona of project.personas) {
      if (
        persona.model_preferences?.preferred_models &&
        persona.model_preferences.preferred_models.length > 0
      ) {
        preferredModel = persona.model_preferences.preferred_models[0];
        if (persona.model_preferences.reasoning_tier === 'high') {
          break;
        }
      }
    }

    const configObj: Record<string, unknown> = {
      'auto-commits': false,
      'test-cmd': 'pnpm test',
      read: ['.aider.prompt.md'],
    };

    if (preferredModel) {
      configObj.model = preferredModel;
    }

    return stringifyYaml(configObj);
  }

  private generateAiderPrompt(project: ResolvedAgentsProject): string {
    const lines: string[] = [];
    const projectName = project.config.project?.name || 'Agent Workspace';
    const projectDesc =
      project.config.project?.description ||
      'AI-assisted software development workspace';

    lines.push(`# ${projectName} - Aider Instructions`);
    lines.push('');
    lines.push(`> ${projectDesc}`);
    lines.push('');

    // Environment & Shell
    lines.push('## Shell Commands');
    lines.push('- Test Suite: `pnpm test`');
    lines.push('- Build: `pnpm build`');
    lines.push('- Typecheck: `pnpm typecheck`');
    lines.push('');

    // Personas Summary
    if (project.personas.length > 0) {
      lines.push('## Available Roles & Personas');
      for (const p of project.personas) {
        lines.push(`- **${p.name}** (\`${p.id}\`): ${p.description || 'Specialized role.'}`);
      }
      lines.push('');
    }

    // Architectural Rules
    if (project.rules.length > 0) {
      lines.push('## Architectural Guidelines & Rules');
      for (const r of project.rules) {
        const globStr =
          r.scope?.globs && r.scope.globs.length > 0
            ? ` [Scope: ${r.scope.globs.join(', ')}]`
            : '';
        lines.push(`### ${r.id}${globStr}`);
        lines.push(r.content.trim());
        lines.push('');
      }
    }

    // Operational Invariants
    lines.push('## Operational Guardrails');
    lines.push('- ALWAYS execute `pnpm test` after modifying code.');
    lines.push('- Never introduce breaking changes without updating tests.');
    lines.push('');

    return lines.join('\n');
  }
}
