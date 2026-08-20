import { describe, it, expect } from 'vitest';
import { CursorAdapter } from '../../adapters/cursor.js';
import { parseFrontmatter } from 'open-agent-engine-core';
import { createMockProject } from '../fixtures/mock-project.js';

describe('CursorAdapter', () => {
  const adapter = new CursorAdapter();

  it('has correct target metadata', () => {
    expect(adapter.target).toBe('cursor');
    expect(adapter.name).toBe('Cursor MDC Adapter');
  });

  it('generates 000-project.mdc with alwaysApply: true', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const projectOverview = files.find((f) => f.path === '.cursor/rules/000-project.mdc');
    expect(projectOverview).toBeDefined();

    const parsed = parseFrontmatter(projectOverview!.content);
    expect(parsed.frontmatter.alwaysApply).toBe(true);
    expect(parsed.body).toContain('test-project');
  });

  it('generates rule .mdc files with accurate globs and alwaysApply values', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const strictRule = files.find((f) => f.path === '.cursor/rules/typescript-strictness.mdc');
    expect(strictRule).toBeDefined();

    const parsedStrict = parseFrontmatter(strictRule!.content);
    expect(parsedStrict.frontmatter.alwaysApply).toBe(true);
    expect(parsedStrict.frontmatter.globs).toBe('src/**/*.ts, packages/**/*.ts');
    expect(parsedStrict.body).toContain('Never use `any`');

    const testRule = files.find((f) => f.path === '.cursor/rules/test-coverage.mdc');
    expect(testRule).toBeDefined();

    const parsedTest = parseFrontmatter(testRule!.content);
    expect(parsedTest.frontmatter.alwaysApply).toBe(false);
    expect(parsedTest.frontmatter.globs).toBe('src/**/__tests__/**/*.ts');
  });

  it('generates persona .mdc files with alwaysApply: false', () => {
    const project = createMockProject();
    const files = adapter.compile(project);

    const personaFile = files.find((f) => f.path === '.cursor/rules/persona-tech-lead.mdc');
    expect(personaFile).toBeDefined();

    const parsed = parseFrontmatter(personaFile!.content);
    expect(parsed.frontmatter.alwaysApply).toBe(false);
    expect(parsed.body).toContain('Principal Software Architect');
  });
});
