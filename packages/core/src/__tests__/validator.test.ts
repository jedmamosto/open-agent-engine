import { describe, it, expect } from 'vitest';
import {
  validatePersona,
  validateRule,
  validateHook,
  validateSkillFrontmatter,
  validateConfig,
  validateAgentsProject,
  isValidGlob,
} from '../parser/validator.js';

describe('Glob Pattern Validation', () => {
  it('should validate standard glob patterns', () => {
    expect(isValidGlob('src/**/*.ts')).toBe(true);
    expect(isValidGlob('packages/*/src/**/*.ts')).toBe(true);
    expect(isValidGlob('*.{js,ts,tsx}')).toBe(true);
    expect(isValidGlob('[a-z]*.md')).toBe(true);
  });

  it('should reject malformed glob patterns', () => {
    expect(isValidGlob('')).toBe(false);
    expect(isValidGlob('   ')).toBe(false);
    expect(isValidGlob('src/**/[a-z.ts')).toBe(false); // Unclosed bracket
    expect(isValidGlob('src/**/*.{ts,tsx')).toBe(false); // Unclosed brace
    expect(isValidGlob('src/**/*.ts}')).toBe(false); // Unmatched closing brace
  });
});

describe('Individual Entity Validators', () => {
  it('should validate valid persona and report errors on invalid persona', () => {
    const valid = validatePersona({
      id: 'architect',
      name: 'Architect',
      description: 'System architect',
      system_prompt: 'You design systems',
    });
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    const invalid = validatePersona({
      id: 'invalid architect id',
      name: '',
      description: '',
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('should validate valid rule and report error on invalid glob in rule', () => {
    const validRule = validateRule({
      id: 'clean-architecture',
      description: 'Clean arch rule',
      scope: { globs: ['src/**/*.ts'], always_apply: true },
      content: 'Do not import domain in infrastructure.',
    });
    expect(validRule.valid).toBe(true);

    const invalidGlobRule = validateRule({
      id: 'bad-glob-rule',
      description: 'Bad glob',
      scope: { globs: ['src/**/[invalid'], always_apply: false },
      content: 'Rule content',
    });
    expect(invalidGlobRule.valid).toBe(false);
    expect(invalidGlobRule.errors.some((e) => e.code === 'INVALID_GLOB_PATTERN')).toBe(true);
  });

  it('should validate hooks and skills', () => {
    const validHook = validateHook({
      id: 'guard',
      event: 'PreToolUse',
      target_tools: ['Bash'],
    });
    expect(validHook.valid).toBe(true);

    const validSkill = validateSkillFrontmatter({
      name: 'refactor-tool',
      description: 'Refactoring helper',
    });
    expect(validSkill.valid).toBe(true);
  });
});

describe('AgentsProjectAST Validation (Cross-Entity Integrity)', () => {
  it('should pass validation on complete and consistent project AST', () => {
    const ast = {
      config: {
        version: '1.0.0',
        targets: ['claude' as const, 'cursor' as const],
        registry: { skills: ['community-skill'] },
        paths: {
          personas: '.agents/personas',
          rules: '.agents/rules',
          skills: '.agents/skills',
          hooks: '.agents/hooks',
        },
      },
      personas: [
        {
          id: 'lead-architect',
          name: 'Lead Architect',
          description: 'Technical lead',
          system_prompt: 'You lead architecture',
          permissions: { tools: { read_files: true }, mcp_servers: [] },
          model_preferences: { reasoning_tier: 'high' as const, preferred_models: ['claude-3-7-sonnet'] },
          skills: ['local-skill', 'community-skill'],
        },
      ],
      rules: [
        {
          id: 'ts-strict',
          description: 'Strict TypeScript',
          scope: { globs: ['src/**/*.ts'], always_apply: true },
          content: 'No any types.',
        },
      ],
      hooks: [
        {
          id: 'pre-tool-guard',
          event: 'PreToolUse' as const,
          target_tools: ['Bash'],
          rules: [],
          fallback_action: 'allow' as const,
        },
      ],
      skills: [
        {
          name: 'local-skill',
          description: 'A local skill definition',
        },
      ],
    };

    const res = validateAgentsProject(ast);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('should detect duplicate persona IDs', () => {
    const ast = {
      personas: [
        {
          id: 'duplicate-id',
          name: 'Persona 1',
          description: 'Description 1',
          system_prompt: 'Prompt 1',
          permissions: { tools: {}, mcp_servers: [] },
          model_preferences: { reasoning_tier: 'medium' as const, preferred_models: [] },
          skills: [],
        },
        {
          id: 'duplicate-id',
          name: 'Persona 2',
          description: 'Description 2',
          system_prompt: 'Prompt 2',
          permissions: { tools: {}, mcp_servers: [] },
          model_preferences: { reasoning_tier: 'medium' as const, preferred_models: [] },
          skills: [],
        },
      ],
    };

    const res = validateAgentsProject(ast);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === 'DUPLICATE_PERSONA_ID')).toBe(true);
  });

  it('should detect missing referenced skills in personas', () => {
    const ast = {
      personas: [
        {
          id: 'engineer',
          name: 'Engineer',
          description: 'Software Engineer',
          system_prompt: 'Prompt',
          permissions: { tools: {}, mcp_servers: [] },
          model_preferences: { reasoning_tier: 'medium' as const, preferred_models: [] },
          skills: ['unresolved-skill-name'],
        },
      ],
      skills: [
        {
          name: 'existing-skill',
          description: 'Exists',
        },
      ],
    };

    const res = validateAgentsProject(ast);
    expect(res.valid).toBe(false);
    const missingSkillError = res.errors.find((e) => e.code === 'MISSING_REFERENCED_SKILL');
    expect(missingSkillError).toBeDefined();
    expect(missingSkillError?.message).toContain('unresolved-skill-name');
  });

  it('should detect duplicate rule IDs and hook IDs', () => {
    const ast = {
      rules: [
        { id: 'dup-rule', description: '', scope: { globs: [], always_apply: false }, content: 'Rule 1' },
        { id: 'dup-rule', description: '', scope: { globs: [], always_apply: false }, content: 'Rule 2' },
      ],
      hooks: [
        { id: 'dup-hook', event: 'PreToolUse' as const, target_tools: ['Bash'], rules: [], fallback_action: 'allow' as const },
        { id: 'dup-hook', event: 'PostToolUse' as const, target_tools: ['Bash'], rules: [], fallback_action: 'allow' as const },
      ],
    };

    const res = validateAgentsProject(ast);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === 'DUPLICATE_RULE_ID')).toBe(true);
    expect(res.errors.some((e) => e.code === 'DUPLICATE_HOOK_ID')).toBe(true);
  });
});
