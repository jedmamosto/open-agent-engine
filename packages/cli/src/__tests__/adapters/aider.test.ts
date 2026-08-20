import { describe, it, expect } from 'vitest';
import { AiderAdapter } from '../../adapters/aider.js';
import { parseYaml } from 'open-agent-engine-core';
import { createMockProject } from '../fixtures/mock-project.js';

describe('AiderAdapter', () => {
  const adapter = new AiderAdapter();

  it('has correct target metadata', () => {
    expect(adapter.target).toBe('aider');
    expect(adapter.name).toBe('Aider Adapter');
  });

  it('generates valid .aider.conf.yml YAML configuration', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const confFile = files.find((f) => f.path === '.aider.conf.yml');
    expect(confFile).toBeDefined();

    const parsed = parseYaml<{
      'auto-commits': boolean;
      'test-cmd': string;
      read: string[];
      model?: string;
    }>(confFile!.content);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data['auto-commits']).toBe(false);
      expect(parsed.data['test-cmd']).toBe('pnpm test');
      expect(parsed.data.read).toContain('.aider.prompt.md');
      expect(parsed.data.model).toBe('claude-3-7-sonnet');
    }
  });

  it('generates .aider.prompt.md with project directives', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const promptFile = files.find((f) => f.path === '.aider.prompt.md');
    expect(promptFile).toBeDefined();
    expect(promptFile?.content).toContain('# test-project - Aider Instructions');
    expect(promptFile?.content).toContain('Tech Lead Architect');
    expect(promptFile?.content).toContain('typescript-strictness');
  });
});
