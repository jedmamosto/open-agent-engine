import { describe, it, expect } from 'vitest';
import { PersonaSchema } from '../schema/persona.js';

describe('PersonaSchema', () => {
  it('should validate a complete and valid persona definition', () => {
    const rawPersona = {
      id: 'qa-behavioral-architect',
      name: 'QA Behavioral Architect',
      description: 'Autonomous TDD architect and behavioral test suite implementer.',
      system_prompt: 'You are a Staff QA Behavioral Architect specializing in TDD.',
      permissions: {
        tools: {
          read_files: true,
          write_files: true,
          execute_bash: true,
        },
        mcp_servers: ['playwright'],
      },
      model_preferences: {
        reasoning_tier: 'high',
        preferred_models: ['claude-3-7-sonnet', 'gpt-4o'],
      },
      skills: ['handoff', 'behavioral-tdd'],
    };

    const parsed = PersonaSchema.parse(rawPersona);
    expect(parsed.id).toBe('qa-behavioral-architect');
    expect(parsed.name).toBe('QA Behavioral Architect');
    expect(parsed.permissions.tools['read_files']).toBe(true);
    expect(parsed.permissions.mcp_servers).toEqual(['playwright']);
    expect(parsed.model_preferences.reasoning_tier).toBe('high');
    expect(parsed.skills).toEqual(['handoff', 'behavioral-tdd']);
  });

  it('should supply sensible defaults when optional fields are omitted', () => {
    const minimalPersona = {
      id: 'frontend-engineer',
      name: 'Frontend Engineer',
      system_prompt: 'You are a Frontend Engineer.',
    };

    const parsed = PersonaSchema.parse(minimalPersona);
    expect(parsed.description).toBe('');
    expect(parsed.permissions).toEqual({ tools: {}, mcp_servers: [] });
    expect(parsed.model_preferences).toEqual({
      reasoning_tier: 'medium',
      preferred_models: [],
    });
    expect(parsed.skills).toEqual([]);
  });

  it('should reject invalid persona IDs with special characters or whitespace', () => {
    const invalidPersona = {
      id: 'invalid persona id with spaces!',
      name: 'Invalid Persona',
      system_prompt: 'Prompt',
    };

    expect(() => PersonaSchema.parse(invalidPersona)).toThrow();
  });

  it('should reject empty system_prompt or empty name', () => {
    expect(() =>
      PersonaSchema.parse({
        id: 'test-id',
        name: '',
        system_prompt: 'Valid prompt',
      })
    ).toThrow();

    expect(() =>
      PersonaSchema.parse({
        id: 'test-id',
        name: 'Test Name',
        system_prompt: '',
      })
    ).toThrow();
  });

  it('should reject invalid reasoning tier', () => {
    expect(() =>
      PersonaSchema.parse({
        id: 'test-id',
        name: 'Test Name',
        system_prompt: 'Prompt',
        model_preferences: {
          reasoning_tier: 'ultra-high',
        },
      })
    ).toThrow();
  });
});
