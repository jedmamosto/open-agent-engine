import type { CanonicalTarget, AgentsProjectAST } from '../core/index.js';
import { BaseAdapter } from './base.js';
import type {
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
} from './types.js';
import { enforceLineBudget } from './utils.js';

export class AAIFAdapter extends BaseAdapter {
  public readonly target: CanonicalTarget = 'aaif';
  public readonly name = 'Universal AAIF Adapter';
  public readonly description =
    'Generates standard AGENTS.md (<150 lines) adhering to Linux Foundation / AAIF specifications';

  public compile(
    projectInput: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] {
    const project = this.normalizeProject(projectInput);
    const files: CompiledFile[] = [];

    // Generate AGENTS.md (<150 lines)
    const agentsMdContent = this.generateAgentsMd(project);
    files.push({
      path: 'AGENTS.md',
      content: enforceLineBudget(agentsMdContent, 145),
      description: 'Universal AAIF AGENTS.md root directives and context index',
    });

    return files;
  }

  private generateAgentsMd(project: ResolvedAgentsProject): string {
    const lines: string[] = [];
    const projectName = project.config.project?.name || 'open-agent-engine';
    const projectDesc =
      project.config.project?.description ||
      'AI-assisted multi-agent software engineering workspace';

    lines.push(`# Agent Directives: ${projectName}`);
    lines.push('');
    lines.push(projectDesc);
    lines.push('');

    // 1. Context Routing Index
    lines.push('## 1. Context Routing Index');
    lines.push('- Active Sprint & Backlog: inspect [agent_docs/backlog.md](file:///agent_docs/backlog.md)');
    lines.push('- Product & Scope: inspect [PRODUCT.md](file:///PRODUCT.md)');
    lines.push('- Design & Visual Identity: inspect [DESIGN.md](file:///DESIGN.md)');
    lines.push('- Architecture & Compilers: inspect [agent_docs/architecture.md](file:///agent_docs/architecture.md)');
    lines.push('- Subagents Directory: inspect [.agents/personas/](file:///c:/.agents/personas/)');
    lines.push('');

    // 2. Shell Commands
    lines.push('## 2. Environment & Shell Commands');
    lines.push('Execute in shell with strict sequential separators:');
    lines.push('- Install: `pnpm install`');
    lines.push('- Build: `pnpm build`');
    lines.push('- Test: `pnpm test`');
    lines.push('- Typecheck: `pnpm typecheck`');
    lines.push('- Dev Mode: `pnpm dev`');
    lines.push('');

    // 3. Operational Invariants
    lines.push('## 3. Operational Invariants & Boundaries ("Rule + Why")');
    lines.push('');
    lines.push('### A. ALWAYS Do');
    lines.push('1. **Validate All Manifests Against Zod Schemas**');
    lines.push('   - *Why*: Catch malformed user configuration early before transpilation to downstream IDEs.');
    lines.push('2. **Preserve Progressive Disclosure**');
    lines.push('   - *Why*: Keep root instruction files under 150 lines to prevent prompt cache invalidations.');
    lines.push('3. **Verify All Tests Pass Before PR**');
    lines.push('   - *Why*: Prevent broken regressions across adapter pipelines.');
    lines.push('');
    lines.push('### B. NEVER Do');
    lines.push('1. **Never Write Platform-Specific Logic in Core Schemas**');
    lines.push('   - *Why*: Maintain 100% vendor-neutral canonical AST representations.');
    lines.push('2. **Never Emit Malformed Frontmatter**');
    lines.push('   - *Why*: Target IDE parsers fail unpredictably when encountering broken YAML headers.');
    lines.push('');

    // 4. Fleet Directory
    if (project.personas.length > 0) {
      lines.push('## 4. Active Fleet & Roles Directory');
      for (const p of project.personas) {
        const skills = p.skills.length > 0 ? ` [Skills: ${p.skills.join(', ')}]` : '';
        lines.push(`- **${p.name}** (\`${p.id}\`): ${p.description || 'Specialized subagent.'}${skills}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
