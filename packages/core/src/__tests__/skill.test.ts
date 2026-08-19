import { describe, it, expect } from 'vitest';
import { SkillFrontmatterSchema } from '../schema/skill.js';

describe('SkillFrontmatterSchema', () => {
  it('should validate complete skill frontmatter', () => {
    const rawSkill = {
      name: 'subagent-coordinator',
      description: 'Orchestrates, gates, and coordinates multiple concurrent subagents.',
      version: '1.0.0',
      entrypoint: 'scripts/coordinator.ts',
      compatibility: ['claude-code', 'cursor'],
    };

    const parsed = SkillFrontmatterSchema.parse(rawSkill);
    expect(parsed.name).toBe('subagent-coordinator');
    expect(parsed.description).toContain('Orchestrates');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.entrypoint).toBe('scripts/coordinator.ts');
    expect(parsed.compatibility).toEqual(['claude-code', 'cursor']);
  });

  it('should validate minimal skill frontmatter', () => {
    const minimal = {
      name: 'tdd-planner',
    };

    const parsed = SkillFrontmatterSchema.parse(minimal);
    expect(parsed.name).toBe('tdd-planner');
    expect(parsed.description).toBe('');
  });

  it('should reject missing or empty name', () => {
    expect(() => SkillFrontmatterSchema.parse({})).toThrow();
    expect(() => SkillFrontmatterSchema.parse({ name: '' })).toThrow();
  });
});
