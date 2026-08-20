import { describe, it, expect } from 'vitest';
import { RuleSchema } from '../schema/rule.js';

describe('RuleSchema', () => {
  it('should validate a complete and valid rule definition', () => {
    const rawRule = {
      id: 'typescript-invariants',
      description: 'Strict TypeScript standards and module boundaries',
      scope: {
        globs: ['src/**/*.ts', 'packages/**/*.ts'],
        always_apply: false,
      },
      content: '- Enforce explicit return types.\n- Prohibit any.',
    };

    const parsed = RuleSchema.parse(rawRule);
    expect(parsed.id).toBe('typescript-invariants');
    expect(parsed.scope.globs).toEqual(['src/**/*.ts', 'packages/**/*.ts']);
    expect(parsed.scope.always_apply).toBe(false);
    expect(parsed.content).toContain('Enforce explicit return types');
  });

  it('should apply defaults for missing description and scope', () => {
    const minimalRule = {
      id: 'core-invariant',
      content: 'Always write tests first.',
    };

    const parsed = RuleSchema.parse(minimalRule);
    expect(parsed.description).toBe('');
    expect(parsed.scope.globs).toEqual([]);
    expect(parsed.scope.always_apply).toBe(false);
  });

  it('should reject invalid rule IDs or empty content', () => {
    expect(() =>
      RuleSchema.parse({
        id: 'bad rule id#',
        content: 'Valid content',
      })
    ).toThrow();

    expect(() =>
      RuleSchema.parse({
        id: 'valid-id',
        content: '',
      })
    ).toThrow();
  });
});
