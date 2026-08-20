import type { CanonicalTarget, AgentsProjectAST } from 'open-agent-engine-core';
import { BaseAdapter } from './base.js';
import type {
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
} from './types.js';
import { enforceLineBudget, stringifyFrontmatter } from './utils.js';

export class ClaudeAdapter extends BaseAdapter {
  public readonly target: CanonicalTarget = 'claude';
  public readonly name = 'Claude Code Adapter';
  public readonly description =
    'Generates context-lean CLAUDE.md index (<150 lines) and .claude/ agent definitions & settings';

  public compile(
    projectInput: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] {
    const project = this.normalizeProject(projectInput);
    const files: CompiledFile[] = [];

    // 1. Generate CLAUDE.md (<150 lines)
    const claudeMdContent = this.generateClaudeMd(project);
    files.push({
      path: 'CLAUDE.md',
      content: enforceLineBudget(claudeMdContent, 145),
      description: 'Claude Code root instructions and context routing index',
    });

    // 2. Generate .claude/agents/<persona.id>.md for each persona
    for (const persona of project.personas) {
      const agentContent = this.generateAgentFile(persona);
      files.push({
        path: `.claude/agents/${persona.id}.md`,
        content: agentContent,
        description: `Claude Code agent persona definition for ${persona.name}`,
      });
    }

    // 3. Generate .claude/settings.json if hooks or config are present
    if (project.hooks.length > 0) {
      const settingsContent = JSON.stringify(
        {
          version: '1.0.0',
          hooks: project.hooks.map((h) => ({
            id: h.id,
            event: h.event,
            targetTools: h.target_tools,
            rules: h.rules,
            fallbackAction: h.fallback_action,
          })),
        },
        null,
        2
      );
      files.push({
        path: '.claude/settings.json',
        content: settingsContent + '\n',
        description: 'Claude Code workspace settings and tool safety hooks',
      });
    }

    return files;
  }

  private generateClaudeMd(project: ResolvedAgentsProject): string {
    const lines: string[] = [];
    const projectName = project.config.project?.name || 'Agent Workspace';
    const projectDesc =
      project.config.project?.description ||
      'AI-assisted software development workspace';

    lines.push(`# ${projectName}`);
    lines.push('');
    lines.push(`> ${projectDesc}`);
    lines.push('');

    // Shell Commands
    lines.push('## 1. Quick Start & Shell Commands');
    lines.push('Run commands using native shell syntax:');
    lines.push('- Build: `pnpm build`');
    lines.push('- Test: `pnpm test`');
    lines.push('- Typecheck: `pnpm typecheck`');
    lines.push('- Dev: `pnpm dev`');
    lines.push('');

    // Personas Index
    if (project.personas.length > 0) {
      lines.push('## 2. Active Personas');
      for (const p of project.personas) {
        const skillsStr =
          p.skills.length > 0 ? ` [Skills: ${p.skills.join(', ')}]` : '';
        const tierStr = p.model_preferences?.reasoning_tier
          ? ` (${p.model_preferences.reasoning_tier} tier)`
          : '';
        lines.push(
          `- **${p.name}** (\`${p.id}\`)${tierStr}: ${p.description || 'Specialized subagent.'}${skillsStr}`
        );
      }
      lines.push('');
      lines.push(
        'Detailed persona prompts: inspect `.claude/agents/*.md` or `.agents/personas/`.'
      );
      lines.push('');
    }

    // Rules Index
    if (project.rules.length > 0) {
      lines.push('## 3. Core Architectural Rules');
      for (const r of project.rules) {
        const globs =
          r.scope?.globs && r.scope.globs.length > 0
            ? ` (${r.scope.globs.join(', ')})`
            : '';
        lines.push(`- **${r.id}**${globs}: ${r.description || 'Architectural rule.'}`);
      }
      lines.push('');
    }

    // Skills Index
    if (project.skills.length > 0) {
      lines.push('## 4. Skills & Capabilities');
      for (const s of project.skills) {
        lines.push(`- **${s.name}**: ${s.description || 'Workspace capability.'}`);
      }
      lines.push('');
    }

    // Operational Invariants
    lines.push('## 5. Operational Invariants');
    lines.push('- **ALWAYS**: Run verification tests (`pnpm test`) before submitting code changes.');
    lines.push('- **ALWAYS**: Keep generated instruction files context-lean and modular.');
    lines.push('- **NEVER**: Commit untested platform adapters or breaking schema changes.');
    lines.push('');

    return lines.join('\n');
  }

  private generateAgentFile(persona: ResolvedAgentsProject['personas'][0]): string {
    const frontmatter: Record<string, unknown> = {
      id: persona.id,
      name: persona.name,
      reasoning_tier: persona.model_preferences?.reasoning_tier ?? 'medium',
    };

    if (
      persona.model_preferences?.preferred_models &&
      persona.model_preferences.preferred_models.length > 0
    ) {
      frontmatter.preferred_models = persona.model_preferences.preferred_models;
    }

    if (persona.skills && persona.skills.length > 0) {
      frontmatter.skills = persona.skills;
    }

    const bodyParts: string[] = [];
    bodyParts.push(`# Persona: ${persona.name}`);
    bodyParts.push('');
    bodyParts.push(persona.system_prompt.trim());
    bodyParts.push('');

    if (persona.permissions) {
      bodyParts.push('## Permissions');
      const toolKeys = Object.entries(persona.permissions.tools || {})
        .filter(([, allowed]) => allowed)
        .map(([tool]) => tool);
      if (toolKeys.length > 0) {
        bodyParts.push(`- Allowed Tools: ${toolKeys.join(', ')}`);
      }
      if (
        persona.permissions.mcp_servers &&
        persona.permissions.mcp_servers.length > 0
      ) {
        bodyParts.push(
          `- MCP Servers: ${persona.permissions.mcp_servers.join(', ')}`
        );
      }
      bodyParts.push('');
    }

    return stringifyFrontmatter(frontmatter, bodyParts.join('\n'));
  }
}
