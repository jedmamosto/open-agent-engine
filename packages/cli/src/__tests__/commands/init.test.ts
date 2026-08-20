import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  executeInit,
  InitConflictError,
} from '../../commands/init.js';
import {
  generateConfigTemplate,
  generatePersonaTemplate,
  generateRuleTemplate,
  generateSkillTemplate,
  generateHookTemplate,
  generateProjectTemplates,
} from '../../templates/index.js';
import { loadAgentsProject } from '../../loader/index.js';

describe('executeInit', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-engine-init-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('scaffolds canonical .agents/ directory structure in non-interactive mode (--yes)', async () => {
    const result = await executeInit({
      rootDir: tmpDir,
      yes: true,
      name: 'my-awesome-agent',
      description: 'A test multi-agent workspace',
    });

    expect(result.success).toBe(true);
    expect(result.rootDir).toBe(path.resolve(tmpDir));
    expect(result.isDryRun).toBe(false);
    expect(result.scaffoldedFiles).toEqual(
      expect.arrayContaining([
        '.agents/config.yaml',
        '.agents/personas/default.md',
        '.agents/rules/000-base.md',
        '.agents/skills/workspace-init/SKILL.md',
        '.agents/hooks/hooks.json',
      ])
    );

    // Verify all scaffolded files exist on disk
    for (const relPath of result.scaffoldedFiles) {
      const fullPath = path.join(tmpDir, relPath);
      const exists = await fs
        .access(fullPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    }

    // Verify config.yaml contents
    const configContent = await fs.readFile(path.join(tmpDir, '.agents/config.yaml'), 'utf8');
    expect(configContent).toContain('name: "my-awesome-agent"');
    expect(configContent).toContain('description: "A test multi-agent workspace"');
    expect(configContent).toContain('- workspace-init');

    // Verify personas/default.md contents
    const personaContent = await fs.readFile(
      path.join(tmpDir, '.agents/personas/default.md'),
      'utf8'
    );
    expect(personaContent).toContain('id: default');
    expect(personaContent).toContain('name: Principal Systems Architect');
    expect(personaContent).toContain('- workspace-init');

    // Verify rules/000-base.md contents
    const ruleContent = await fs.readFile(
      path.join(tmpDir, '.agents/rules/000-base.md'),
      'utf8'
    );
    expect(ruleContent).toContain('id: 000-base');
    const ruleLineCount = ruleContent.split('\n').length;
    expect(ruleLineCount).toBeLessThan(150);

    // Verify skills/workspace-init/SKILL.md contents
    const skillContent = await fs.readFile(
      path.join(tmpDir, '.agents/skills/workspace-init/SKILL.md'),
      'utf8'
    );
    expect(skillContent).toContain('name: workspace-init');
    expect(skillContent).toContain('Workspace Initialization Protocol');

    // Verify hooks/hooks.json contents
    const hookContent = await fs.readFile(
      path.join(tmpDir, '.agents/hooks/hooks.json'),
      'utf8'
    );
    const parsedHooks = JSON.parse(hookContent);
    expect(Array.isArray(parsedHooks)).toBe(true);
    expect(parsedHooks[0].id).toBe('safety-guard');
    expect(parsedHooks[0].event).toBe('PreToolUse');
  });

  it('triggers auto-build and generates native platform configs by default', async () => {
    const result = await executeInit({
      rootDir: tmpDir,
      yes: true,
      name: 'auto-build-project',
      targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
    });

    expect(result.buildResult).toBeDefined();
    expect(result.buildResult?.success).toBe(true);
    expect(result.buildResult?.targets).toHaveLength(6);

    // Verify Claude target files
    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('# auto-build-project');

    // Verify Cursor target files
    const cursorRule = await fs.readFile(
      path.join(tmpDir, '.cursor/rules/000-project.mdc'),
      'utf8'
    );
    expect(cursorRule).toContain('alwaysApply: true');

    // Verify Windsurf target files
    const windsurfRules = await fs.readFile(path.join(tmpDir, '.windsurfrules'), 'utf8');
    expect(windsurfRules).toContain('auto-build-project');

    // Verify Roo target files
    const rooModes = await fs.readFile(path.join(tmpDir, '.roomodes'), 'utf8');
    expect(rooModes).toContain('customModes');

    // Verify Aider target files
    const aiderConf = await fs.readFile(path.join(tmpDir, '.aider.conf.yml'), 'utf8');
    expect(aiderConf).toContain('read:');

    // Verify AAIF target files
    const agentsMd = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    expect(agentsMd).toContain('# Agent Directives: auto-build-project');
  });

  it('respects --no-build flag and avoids running compilation', async () => {
    const result = await executeInit({
      rootDir: tmpDir,
      yes: true,
      noBuild: true,
    });

    expect(result.success).toBe(true);
    expect(result.buildResult).toBeUndefined();

    // Canonical files should exist
    const configExists = await fs
      .access(path.join(tmpDir, '.agents/config.yaml'))
      .then(() => true)
      .catch(() => false);
    expect(configExists).toBe(true);

    // Native build output should NOT exist
    const claudeExists = await fs
      .access(path.join(tmpDir, 'CLAUDE.md'))
      .then(() => true)
      .catch(() => false);
    expect(claudeExists).toBe(false);
  });

  it('handles custom target selection', async () => {
    const result = await executeInit({
      rootDir: tmpDir,
      yes: true,
      targets: ['claude', 'cursor'],
    });

    expect(result.targets).toEqual(['claude', 'cursor']);
    expect(result.buildResult?.targets.map((t) => t.target)).toEqual(['claude', 'cursor']);

    const claudeExists = await fs
      .access(path.join(tmpDir, 'CLAUDE.md'))
      .then(() => true)
      .catch(() => false);
    expect(claudeExists).toBe(true);

    const cursorExists = await fs
      .access(path.join(tmpDir, '.cursor/rules/000-project.mdc'))
      .then(() => true)
      .catch(() => false);
    expect(cursorExists).toBe(true);

    const windsurfExists = await fs
      .access(path.join(tmpDir, '.windsurfrules'))
      .then(() => true)
      .catch(() => false);
    expect(windsurfExists).toBe(false);
  });

  it('detects conflicts when .agents already exists and throws InitConflictError without --force', async () => {
    // Pre-create .agents directory
    await fs.mkdir(path.join(tmpDir, '.agents'), { recursive: true });

    await expect(
      executeInit({
        rootDir: tmpDir,
        yes: true,
        force: false,
      })
    ).rejects.toThrow(InitConflictError);
  });

  it('overwrites existing .agents directory when --force is specified', async () => {
    // Pre-create .agents with old config
    await fs.mkdir(path.join(tmpDir, '.agents'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.agents/config.yaml'),
      'version: "0.0.1"\nproject:\n  name: "old-project"\n'
    );

    const result = await executeInit({
      rootDir: tmpDir,
      yes: true,
      force: true,
      name: 'new-forced-project',
    });

    expect(result.success).toBe(true);
    const updatedConfig = await fs.readFile(
      path.join(tmpDir, '.agents/config.yaml'),
      'utf8'
    );
    expect(updatedConfig).toContain('name: "new-forced-project"');
  });

  it('performs dry-run preview without writing any files to disk', async () => {
    const result = await executeInit({
      rootDir: tmpDir,
      yes: true,
      dryRun: true,
      name: 'dry-run-demo',
    });

    expect(result.isDryRun).toBe(true);
    expect(result.scaffoldedFiles.length).toBeGreaterThan(0);

    // Verify nothing was written to disk
    const agentsExists = await fs
      .access(path.join(tmpDir, '.agents'))
      .then(() => true)
      .catch(() => false);
    expect(agentsExists).toBe(false);

    const claudeExists = await fs
      .access(path.join(tmpDir, 'CLAUDE.md'))
      .then(() => true)
      .catch(() => false);
    expect(claudeExists).toBe(false);
  });

  it('scaffolded project loads and validates cleanly through loader', async () => {
    await executeInit({
      rootDir: tmpDir,
      yes: true,
      name: 'validated-project',
    });

    const loaded = await loadAgentsProject(tmpDir, { strict: true });
    expect(loaded.validation.valid).toBe(true);
    expect(loaded.validation.errors).toHaveLength(0);
    expect(loaded.ast.personas).toHaveLength(1);
    expect(loaded.ast.personas[0].id).toBe('default');
    expect(loaded.ast.rules).toHaveLength(1);
    expect(loaded.ast.rules[0].id).toBe('000-base');
    expect(loaded.ast.skills).toHaveLength(1);
    expect(loaded.ast.skills[0].name).toBe('workspace-init');
    expect(loaded.ast.hooks).toHaveLength(1);
    expect(loaded.ast.hooks[0].id).toBe('safety-guard');
  });
});

describe('Template Generators', () => {
  it('generates config template with custom parameters', () => {
    const yaml = generateConfigTemplate({
      projectName: 'custom-app',
      projectDescription: 'Custom description',
      targets: ['claude', 'cursor'],
    });

    expect(yaml).toContain('name: "custom-app"');
    expect(yaml).toContain('description: "Custom description"');
    expect(yaml).toContain('  - claude');
    expect(yaml).toContain('  - cursor');
  });

  it('generates persona template with valid AAIF markdown frontmatter', () => {
    const persona = generatePersonaTemplate({
      id: 'lead-dev',
      name: 'Lead Developer',
      skills: ['workspace-init'],
    });

    expect(persona).toContain('id: lead-dev');
    expect(persona).toContain('name: Lead Developer');
    expect(persona).toContain('skills:\n  - workspace-init');
    expect(persona).toContain('# Role & Purpose');
  });

  it('generates rule template with strict line budget under 150 lines', () => {
    const rule = generateRuleTemplate({
      id: '000-base',
      globs: ['**/*'],
      alwaysApply: true,
    });

    expect(rule).toContain('id: 000-base');
    expect(rule).toContain('always_apply: true');
    const lines = rule.split('\n');
    expect(lines.length).toBeLessThan(150);
  });

  it('generates skill template with valid frontmatter', () => {
    const skill = generateSkillTemplate({
      name: 'workspace-init',
      version: '1.0.0',
    });

    expect(skill).toContain('name: workspace-init');
    expect(skill).toContain('version: 1.0.0');
    expect(skill).toContain('# Workspace Initialization Protocol');
  });

  it('generates hook template as valid JSON with safety rules', () => {
    const hookJson = generateHookTemplate({
      id: 'custom-guard',
      fallbackAction: 'allow',
    });

    const parsed = JSON.parse(hookJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('custom-guard');
    expect(parsed[0].fallback_action).toBe('allow');
    expect(parsed[0].rules.length).toBeGreaterThan(0);
  });

  it('aggregates all canonical project templates via generateProjectTemplates', () => {
    const templates = generateProjectTemplates({
      projectName: 'bundle-test',
      targets: ['claude', 'aaif'],
    });

    expect(Object.keys(templates)).toEqual([
      '.agents/config.yaml',
      '.agents/personas/default.md',
      '.agents/rules/000-base.md',
      '.agents/skills/workspace-init/SKILL.md',
      '.agents/hooks/hooks.json',
    ]);
  });
});
