import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../../adapters/claude.js';
import { createMockProject } from '../fixtures/mock-project.js';

describe('ClaudeAdapter', () => {
  const adapter = new ClaudeAdapter();

  it('has correct target metadata', () => {
    expect(adapter.target).toBe('claude');
    expect(adapter.name).toBe('Claude Code Adapter');
  });

  it('compiles CLAUDE.md adhering strictly to <150 lines budget', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const claudeMd = files.find((f) => f.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.content).toContain('# test-project');
    expect(claudeMd?.content).toContain('pnpm build');
    expect(claudeMd?.content).toContain('Tech Lead Architect');
    expect(claudeMd?.content).toContain('typescript-strictness');

    const lines = claudeMd!.content.split(/\r?\n/).length;
    expect(lines).toBeLessThan(150);
  });

  it('emits agent definition files for each persona in .claude/agents/', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const techLeadAgent = files.find((f) => f.path === '.claude/agents/tech-lead.md');
    expect(techLeadAgent).toBeDefined();
    expect(techLeadAgent?.content).toContain('name: Tech Lead Architect');
    expect(techLeadAgent?.content).toContain('reasoning_tier: high');
    expect(techLeadAgent?.content).toContain('Principal Software Architect');
    expect(techLeadAgent?.content).toContain('MCP Servers: playwright');

    const qaAgent = files.find((f) => f.path === '.claude/agents/qa-engineer.md');
    expect(qaAgent).toBeDefined();
    expect(qaAgent?.content).toContain('name: QA Engineer');
  });

  it('emits .claude/settings.json when hooks are configured', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const settings = files.find((f) => f.path === '.claude/settings.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content);
    expect(parsed.hooks).toHaveLength(1);
    expect(parsed.hooks[0].id).toBe('safety-guard');
    expect(parsed.hooks[0].event).toBe('PreToolUse');
  });

  it('handles empty personas, rules, and hooks gracefully', () => {
    const project = createMockProject({
      personas: [],
      rules: [],
      hooks: [],
      skills: [],
    });
    const files = adapter.compile(project);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('CLAUDE.md');
    expect(files[0].content.split(/\r?\n/).length).toBeLessThan(150);
  });
});
