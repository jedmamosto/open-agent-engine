import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadAgentsProject, formatDiagnostics } from '../../loader/index.js';

describe('loadAgentsProject', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-engine-loader-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('loads default config when .agents folder is empty or absent', async () => {
    const loaded = await loadAgentsProject(tmpDir);
    expect(loaded.ast.config.version).toBe('1.0.0');
    expect(loaded.ast.personas).toEqual([]);
    expect(loaded.ast.rules).toEqual([]);
    expect(loaded.validation.valid).toBe(true);
  });

  it('loads and parses complete .agents structure', async () => {
    const agentsDir = path.join(tmpDir, '.agents');
    await fs.mkdir(path.join(agentsDir, 'personas'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'rules'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'hooks'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'skills', 'test-skill'), { recursive: true });

    // config.yaml
    await fs.writeFile(
      path.join(agentsDir, 'config.yaml'),
      `version: "1.0.0"\nproject:\n  name: "demo-project"\ntargets:\n  - claude\n  - cursor\n`
    );

    // personas/dev.yaml
    await fs.writeFile(
      path.join(agentsDir, 'personas', 'dev.yaml'),
      `id: dev\nname: Developer\nsystem_prompt: "You are a software engineer."\nskills:\n  - test-skill\n`
    );

    // rules/ts.yaml
    await fs.writeFile(
      path.join(agentsDir, 'rules', 'ts.yaml'),
      `id: ts-rule\nscope:\n  globs: ["src/**/*.ts"]\n  always_apply: true\ncontent: "Strict TS only."\n`
    );

    // hooks/guard.yaml
    await fs.writeFile(
      path.join(agentsDir, 'hooks', 'guard.yaml'),
      `id: bash-guard\nevent: PreToolUse\ntarget_tools:\n  - bash\nrules:\n  - pattern: "rm -rf"\n    action: deny\n`
    );

    // skills/test-skill/SKILL.md
    await fs.writeFile(
      path.join(agentsDir, 'skills', 'test-skill', 'SKILL.md'),
      `---\nname: test-skill\ndescription: A test skill\n---\n# Test Skill Instructions\n`
    );

    const loaded = await loadAgentsProject(tmpDir);

    expect(loaded.validation.valid).toBe(true);
    expect(loaded.ast.config.project?.name).toBe('demo-project');
    expect(loaded.ast.personas).toHaveLength(1);
    expect(loaded.ast.personas[0].id).toBe('dev');
    expect(loaded.ast.rules).toHaveLength(1);
    expect(loaded.ast.rules[0].id).toBe('ts-rule');
    expect(loaded.ast.hooks).toHaveLength(1);
    expect(loaded.ast.hooks[0].id).toBe('bash-guard');
    expect(loaded.ast.skills).toHaveLength(1);
    expect(loaded.ast.skills[0].name).toBe('test-skill');
  });

  it('detects cross-entity validation issues (e.g. unreferenced skill)', async () => {
    const agentsDir = path.join(tmpDir, '.agents');
    await fs.mkdir(path.join(agentsDir, 'personas'), { recursive: true });

    await fs.writeFile(
      path.join(agentsDir, 'personas', 'dev.yaml'),
      `id: dev\nname: Developer\nsystem_prompt: "You are a software engineer."\nskills:\n  - nonexistent-skill\n`
    );

    const loaded = await loadAgentsProject(tmpDir);
    expect(loaded.validation.valid).toBe(false);
    expect(loaded.validation.errors.some((e) => e.code === 'MISSING_REFERENCED_SKILL')).toBe(true);

    const formatted = formatDiagnostics(loaded.validation);
    expect(formatted).toContain('MISSING_REFERENCED_SKILL');
  });
});
