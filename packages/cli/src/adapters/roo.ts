import type { CanonicalTarget, AgentsProjectAST } from 'open-agent-engine-core';
import { BaseAdapter } from './base.js';
import type {
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
} from './types.js';

interface RooCustomMode {
  slug: string;
  name: string;
  roleDefinition: string;
  customInstructions: string;
  groups: string[];
}

interface RooModesConfig {
  customModes: RooCustomMode[];
}

export class RooAdapter extends BaseAdapter {
  public readonly target: CanonicalTarget = 'roo';
  public readonly name = 'Roo Code Adapter';
  public readonly description =
    'Generates .roomodes JSON configuration and .clinerules prompt constraints';

  public compile(
    projectInput: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] {
    const project = this.normalizeProject(projectInput);
    const files: CompiledFile[] = [];

    // 1. Generate .roomodes JSON
    const roomodes = this.generateRooModes(project);
    files.push({
      path: '.roomodes',
      content: JSON.stringify(roomodes, null, 2) + '\n',
      description: 'Roo Code / Cline custom modes definition',
    });

    // 2. Generate .clinerules
    const clinerules = this.generateClineRules(project);
    files.push({
      path: '.clinerules',
      content: clinerules,
      description: 'Roo Code / Cline project-wide system instruction rules',
    });

    return files;
  }

  private generateRooModes(project: ResolvedAgentsProject): RooModesConfig {
    const customModes: RooCustomMode[] = [];

    for (const persona of project.personas) {
      const groups = this.resolveRooGroups(persona);
      const customInstructions = this.buildPersonaInstructions(persona, project);

      customModes.push({
        slug: persona.id,
        name: persona.name,
        roleDefinition:
          persona.description || `Specialized agent role for ${persona.name}.`,
        customInstructions,
        groups,
      });
    }

    return { customModes };
  }

  private resolveRooGroups(
    persona: ResolvedAgentsProject['personas'][0]
  ): string[] {
    const groups = new Set<string>();
    const tools = persona.permissions?.tools || {};

    if (Object.keys(tools).length === 0) {
      return ['read', 'edit', 'browser', 'command', 'mcp'];
    }

    if (tools.read_files !== false && (tools.read_files || tools.read)) {
      groups.add('read');
    }
    if (tools.write_files !== false && (tools.write_files || tools.edit || tools.write)) {
      groups.add('edit');
    }
    if (tools.execute_bash || tools.command || tools.terminal_execute) {
      groups.add('command');
    }
    if (tools.browser) {
      groups.add('browser');
    }
    if (
      persona.permissions?.mcp_servers &&
      persona.permissions.mcp_servers.length > 0
    ) {
      groups.add('mcp');
    }

    // Default fallback if none matched
    if (groups.size === 0) {
      groups.add('read');
      groups.add('edit');
      groups.add('command');
    }

    return Array.from(groups);
  }

  private buildPersonaInstructions(
    persona: ResolvedAgentsProject['personas'][0],
    project: ResolvedAgentsProject
  ): string {
    const parts: string[] = [];
    parts.push(persona.system_prompt.trim());

    if (persona.skills && persona.skills.length > 0) {
      parts.push('');
      parts.push(`## Assigned Skills: ${persona.skills.join(', ')}`);
    }

    if (
      persona.model_preferences?.preferred_models &&
      persona.model_preferences.preferred_models.length > 0
    ) {
      parts.push('');
      parts.push(
        `Preferred Models: ${persona.model_preferences.preferred_models.join(', ')} (Tier: ${persona.model_preferences.reasoning_tier})`
      );
    }

    return parts.join('\n');
  }

  private generateClineRules(project: ResolvedAgentsProject): string {
    const lines: string[] = [];
    const projectName = project.config.project?.name || 'Agent Workspace';
    const projectDesc =
      project.config.project?.description ||
      'AI-assisted software development workspace';

    lines.push(`# ${projectName} - Cline/Roo Instructions`);
    lines.push('');
    lines.push(`> ${projectDesc}`);
    lines.push('');

    // Environment & Shell
    lines.push('## Shell Commands');
    lines.push('- Build: `pnpm build`');
    lines.push('- Test: `pnpm test`');
    lines.push('- Typecheck: `pnpm typecheck`');
    lines.push('- Dev: `pnpm dev`');
    lines.push('');

    // Rules
    if (project.rules.length > 0) {
      lines.push('## Architectural Rules');
      for (const r of project.rules) {
        const globStr =
          r.scope?.globs && r.scope.globs.length > 0
            ? ` [${r.scope.globs.join(', ')}]`
            : '';
        lines.push(`### ${r.id}${globStr}`);
        lines.push(r.content.trim());
        lines.push('');
      }
    }

    // Operational Invariants
    lines.push('## Operational Invariants');
    lines.push('- Run all test suites before concluding any task.');
    lines.push('- Respect module boundaries and avoid monolithic file expansions.');
    lines.push('');

    return lines.join('\n');
  }
}
