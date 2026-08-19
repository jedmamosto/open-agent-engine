import { describe, it, expect } from 'vitest';
import { ConfigSchema, normalizeTarget } from '../schema/config.js';

describe('ConfigSchema', () => {
  it('should validate full project config with aliases and custom paths', () => {
    const rawConfig = {
      version: '1.0.0',
      project: {
        name: 'open-agent-engine',
        description: 'Cross-platform multi-agent scaffolding',
        authors: ['Architect Team'],
      },
      targets: ['claude-code', 'cursor', 'windsurf', 'roo-code', 'aider', 'aaif-agents-md'],
      registry: {
        skills: ['impeccable', 'handoff'],
      },
      paths: {
        personas: '.agents/personas',
        rules: '.agents/rules',
        skills: '.agents/skills',
        hooks: '.agents/hooks',
      },
      skills: {
        handoff: {
          source: 'local',
          version: '1.0.0',
        },
      },
    };

    const parsed = ConfigSchema.parse(rawConfig);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.project?.name).toBe('open-agent-engine');
    expect(parsed.targets).toHaveLength(6);
    expect(parsed.paths.personas).toBe('.agents/personas');
    expect(parsed.skills?.['handoff']?.source).toBe('local');
  });

  it('should apply sensible defaults when optional fields are omitted', () => {
    const parsed = ConfigSchema.parse({});
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.targets).toEqual(['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif']);
    expect(parsed.paths.personas).toBe('.agents/personas');
    expect(parsed.paths.rules).toBe('.agents/rules');
    expect(parsed.paths.skills).toBe('.agents/skills');
    expect(parsed.paths.hooks).toBe('.agents/hooks');
    expect(parsed.registry.skills).toEqual([]);
  });

  it('should normalize target names accurately', () => {
    expect(normalizeTarget('claude-code')).toBe('claude');
    expect(normalizeTarget('claude')).toBe('claude');
    expect(normalizeTarget('roo-code')).toBe('roo');
    expect(normalizeTarget('roo')).toBe('roo');
    expect(normalizeTarget('aaif-agents-md')).toBe('aaif');
    expect(normalizeTarget('aaif')).toBe('aaif');
    expect(normalizeTarget('cursor')).toBe('cursor');
    expect(normalizeTarget('windsurf')).toBe('windsurf');
    expect(normalizeTarget('aider')).toBe('aider');
    expect(() => normalizeTarget('unsupported-target')).toThrow();
  });
});
