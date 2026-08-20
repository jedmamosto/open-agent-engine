import { describe, it, expect } from 'vitest';
import { RooAdapter } from '../../adapters/roo.js';
import { createMockProject } from '../fixtures/mock-project.js';

describe('RooAdapter', () => {
  const adapter = new RooAdapter();

  it('has correct target metadata', () => {
    expect(adapter.target).toBe('roo');
    expect(adapter.name).toBe('Roo Code Adapter');
  });

  it('generates valid .roomodes JSON configuration', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const roomodesFile = files.find((f) => f.path === '.roomodes');
    expect(roomodesFile).toBeDefined();

    const json = JSON.parse(roomodesFile!.content);
    expect(json.customModes).toHaveLength(2);

    const techLeadMode = json.customModes.find((m: { slug: string }) => m.slug === 'tech-lead');
    expect(techLeadMode).toBeDefined();
    expect(techLeadMode.name).toBe('Tech Lead Architect');
    expect(techLeadMode.groups).toContain('read');
    expect(techLeadMode.groups).toContain('edit');
    expect(techLeadMode.groups).toContain('command');
    expect(techLeadMode.groups).toContain('browser');
    expect(techLeadMode.groups).toContain('mcp');
    expect(techLeadMode.customInstructions).toContain('Principal Software Architect');
  });

  it('generates .clinerules with rules and shell commands', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const clinerules = files.find((f) => f.path === '.clinerules');
    expect(clinerules).toBeDefined();
    expect(clinerules?.content).toContain('test-project');
    expect(clinerules?.content).toContain('pnpm test');
    expect(clinerules?.content).toContain('typescript-strictness');
  });
});
