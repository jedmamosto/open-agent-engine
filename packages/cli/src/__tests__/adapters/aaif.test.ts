import { describe, it, expect } from 'vitest';
import { AAIFAdapter } from '../../adapters/aaif.js';
import { createMockProject } from '../fixtures/mock-project.js';

describe('AAIFAdapter', () => {
  const adapter = new AAIFAdapter();

  it('has correct target metadata', () => {
    expect(adapter.target).toBe('aaif');
    expect(adapter.name).toBe('Universal AAIF Adapter');
  });

  it('generates standard AGENTS.md adhering strictly to <150 lines budget', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const agentsMd = files.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.content).toContain('# Agent Directives: test-project');
    expect(agentsMd?.content).toContain('## 1. Context Routing Index');
    expect(agentsMd?.content).toContain('## 2. Environment & Shell Commands');
    expect(agentsMd?.content).toContain('## 3. Operational Invariants & Boundaries');
    expect(agentsMd?.content).toContain('## 4. Active Fleet & Roles Directory');
    expect(agentsMd?.content).toContain('Tech Lead Architect');

    const lines = agentsMd!.content.split(/\r?\n/).length;
    expect(lines).toBeLessThan(150);
  });
});
