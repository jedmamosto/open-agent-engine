import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeBuild, BuildValidationError } from '../../commands/build.js';

describe('executeBuild', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-engine-build-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function setupMinimalAgentsProject(dir: string): Promise<void> {
    const agentsDir = path.join(dir, '.agents');
    await fs.mkdir(path.join(agentsDir, 'personas'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'rules'), { recursive: true });

    await fs.writeFile(
      path.join(agentsDir, 'config.yaml'),
      `version: "1.0.0"\nproject:\n  name: "build-demo"\ntargets:\n  - claude\n  - cursor\n  - windsurf\n  - roo\n  - aider\n  - aaif\n`
    );

    await fs.writeFile(
      path.join(agentsDir, 'personas', 'architect.yaml'),
      `id: architect\nname: Software Architect\nsystem_prompt: "Principal Architect."\n`
    );

    await fs.writeFile(
      path.join(agentsDir, 'rules', 'strict.yaml'),
      `id: strict\nscope:\n  globs: ["**/*.ts"]\n  always_apply: true\ncontent: "Strict TS standard."\n`
    );
  }

  it('compiles all requested targets and writes output files to disk', async () => {
    await setupMinimalAgentsProject(tmpDir);

    const result = await executeBuild({
      rootDir: tmpDir,
      targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
      dryRun: false,
    });

    expect(result.success).toBe(true);
    expect(result.targets).toHaveLength(6);
    expect(result.totalFiles).toBeGreaterThan(5);

    // Verify files on disk
    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('# build-demo');

    const cursorOverview = await fs.readFile(
      path.join(tmpDir, '.cursor', 'rules', '000-project.mdc'),
      'utf8'
    );
    expect(cursorOverview).toContain('alwaysApply: true');

    const windsurfRules = await fs.readFile(path.join(tmpDir, '.windsurfrules'), 'utf8');
    expect(windsurfRules).toContain('build-demo');

    const roomodes = await fs.readFile(path.join(tmpDir, '.roomodes'), 'utf8');
    expect(JSON.parse(roomodes).customModes).toHaveLength(1);

    const aiderConf = await fs.readFile(path.join(tmpDir, '.aider.conf.yml'), 'utf8');
    expect(aiderConf).toContain('read:');

    const agentsMd = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    expect(agentsMd).toContain('# Agent Directives: build-demo');
  });

  it('performs dry-run without writing any files to disk', async () => {
    await setupMinimalAgentsProject(tmpDir);

    const result = await executeBuild({
      rootDir: tmpDir,
      targets: ['claude', 'cursor'],
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.totalFiles).toBeGreaterThan(0);

    // Ensure files were not created
    await expect(fs.access(path.join(tmpDir, 'CLAUDE.md'))).rejects.toThrow();
    await expect(
      fs.access(path.join(tmpDir, '.cursor', 'rules', '000-project.mdc'))
    ).rejects.toThrow();
  });

  it('filters targets when target subset is specified', async () => {
    await setupMinimalAgentsProject(tmpDir);

    const result = await executeBuild({
      rootDir: tmpDir,
      targets: ['claude-code', 'cursor'],
      dryRun: true,
    });

    expect(result.targets.map((t) => t.target)).toEqual(['claude', 'cursor']);
  });

  it('throws BuildValidationError when project contains invalid schemas in strict mode', async () => {
    const agentsDir = path.join(tmpDir, '.agents');
    await fs.mkdir(path.join(agentsDir, 'personas'), { recursive: true });

    // Missing required name and system_prompt
    await fs.writeFile(
      path.join(agentsDir, 'personas', 'broken.yaml'),
      `id: broken\n`
    );

    await expect(
      executeBuild({
        rootDir: tmpDir,
        strict: true,
      })
    ).rejects.toThrow(BuildValidationError);
  });
});
