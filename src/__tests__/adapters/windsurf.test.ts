import { describe, it, expect } from 'vitest';
import { WindsurfAdapter } from '../../adapters/windsurf.js';
import { createMockProject } from '../fixtures/mock-project.js';

describe('WindsurfAdapter', () => {
  const adapter = new WindsurfAdapter();

  it('has correct target metadata', () => {
    expect(adapter.target).toBe('windsurf');
    expect(adapter.name).toBe('Windsurf Adapter');
  });

  it('generates root .windsurfrules file', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const rootRules = files.find((f) => f.path === '.windsurfrules');
    expect(rootRules).toBeDefined();
    expect(rootRules?.content).toContain('test-project');
    expect(rootRules?.content).toContain('Cascade AI Directives');
    expect(rootRules?.content).toContain('Tech Lead Architect');
    expect(rootRules?.content).toContain('Rule: typescript-strictness');
  });

  it('generates modular .windsurf/rules/<id>.md files', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const ruleFile = files.find((f) => f.path === '.windsurf/rules/typescript-strictness.md');
    expect(ruleFile).toBeDefined();
    expect(ruleFile?.content).toContain('**Scope Globs**: src/**/*.ts, packages/**/*.ts');
    expect(ruleFile?.content).toContain('**Always Apply**: Yes');
    expect(ruleFile?.content).toContain('Never use `any`');
  });
});
