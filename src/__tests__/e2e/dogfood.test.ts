/**
 * End-to-End (E2E) Dogfooding & Vision Verification Suite
 * Tests the complete lifecycle across all 4 Product Pillars:
 * Pillar 1: Scaffolding Wizard (executeInit)
 * Pillar 2: Cross-Platform Adapter Transpiler (executeBuild)
 * Pillar 3: Community SkillHub & Package Manager (executeSkillAdd, Create, List, Remove)
 * Pillar 4: Git-Native Ephemeral Worktrees (createWorktree, listWorktrees, mergeWorktree, removeWorktree)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { executeInit } from '../../commands/init.js';
import { executeBuild } from '../../commands/build.js';
import {
  executeSkillAdd,
  executeSkillCreate,
  executeSkillList,
  executeSkillRemove,
} from '../../commands/skill.js';
import {
  createWorktree,
  listWorktrees,
  mergeWorktree,
  removeWorktree,
} from '../../core/index.js';

const execFileAsync = promisify(execFile);

describe('E2E Full-Lifecycle Dogfooding: All 4 Product Pillars', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-engine-e2e-'));
    // Initialize a real git repository in testDir for Git worktree verification
    await execFileAsync('git', ['init', '-b', 'main'], { cwd: testDir });
    await execFileAsync('git', ['config', 'user.name', 'E2E Tester'], { cwd: testDir });
    await execFileAsync('git', ['config', 'user.email', 'test@agent-engine.dev'], { cwd: testDir });
    await fs.promises.writeFile(path.join(testDir, 'README.md'), '# E2E Test Repo\n');
    await execFileAsync('git', ['add', '.'], { cwd: testDir });
    await execFileAsync('git', ['commit', '-m', 'initial commit'], { cwd: testDir });
  });

  afterEach(async () => {
    try {
      if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore teardown cleanup on Windows locked handles
    }
  });

  it('Pillar 1: Scaffolding Wizard (agent-engine init) generates valid canonical .agents/ structure', async () => {
    const result = await executeInit({
      dir: testDir,
      yes: true,
      name: 'dogfood-project',
      description: 'E2E Dogfood Project',
      targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
      noBuild: true,
    });

    expect(result.success).toBe(true);
    expect(result.scaffoldedFiles.length).toBeGreaterThanOrEqual(5);

    // 1. Verify Canonical .agents/ Directory Structure
    const agentsDir = path.join(testDir, '.agents');
    expect(fs.existsSync(path.join(agentsDir, 'config.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'personas', 'default.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'rules', '000-base.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'skills', 'workspace-init', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'hooks', 'hooks.json'))).toBe(true);

    // 2. Verify Rule Budget Constraint (<150 lines)
    const ruleContent = fs.readFileSync(path.join(agentsDir, 'rules', '000-base.md'), 'utf8');
    const lineCount = ruleContent.split(/\r?\n/).length;
    expect(lineCount).toBeLessThan(150);

    // 3. Verify Persona AAIF Frontmatter
    const personaContent = fs.readFileSync(path.join(agentsDir, 'personas', 'default.md'), 'utf8');
    expect(personaContent).toContain('workspace-init');
  });

  it('Pillar 2: Adapter Transpiler (agent-engine build) produces zero-loss native configs', async () => {
    // Scaffold first
    await executeInit({
      dir: testDir,
      yes: true,
      targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
      noBuild: true,
    });

    // Run build across all 6 supported platforms
    const buildResult = await executeBuild({
      rootDir: testDir,
      strict: true,
    });

    expect(buildResult.totalFiles).toBeGreaterThanOrEqual(6);
    expect(buildResult.targets.length).toBe(6);

    // Verify Claude Code Config
    expect(fs.existsSync(path.join(testDir, 'CLAUDE.md'))).toBe(true);
    const claudeMd = fs.readFileSync(path.join(testDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('Quick Start');
    expect(claudeMd).toContain('000-base');

    // Verify Cursor Rules Config
    const cursorRulesDir = path.join(testDir, '.cursor', 'rules');
    expect(fs.existsSync(cursorRulesDir)).toBe(true);
    const cursorFiles = fs.readdirSync(cursorRulesDir);
    expect(cursorFiles.some((f) => f.endsWith('.mdc'))).toBe(true);

    // Verify Windsurf Rules Config
    expect(fs.existsSync(path.join(testDir, '.windsurfrules'))).toBe(true);

    // Verify Roo Code / Cline Modes Config
    expect(fs.existsSync(path.join(testDir, '.roomodes'))).toBe(true);

    // Verify Aider Config
    expect(fs.existsSync(path.join(testDir, '.aider.conf.yml'))).toBe(true);

    // Verify AAIF Root AGENTS.md
    expect(fs.existsSync(path.join(testDir, 'AGENTS.md'))).toBe(true);
    const agentsMd = fs.readFileSync(path.join(testDir, 'AGENTS.md'), 'utf8');
    expect(agentsMd).toContain('Agent Directives');
    expect(agentsMd).toContain('Context Routing Index');
  });

  it('Pillar 3: SkillHub Package Manager handles create, add from catalog, list, and remove', async () => {
    // Scaffold initial workspace
    await executeInit({
      dir: testDir,
      yes: true,
      noBuild: true,
    });

    // 1. Skill Create (Custom Bespoke Skill)
    const createResult = await executeSkillCreate({
      dir: testDir,
      name: 'api-optimizer',
      description: 'API endpoint profiling and caching optimizer',
      tags: ['backend', 'performance', 'rest'],
    });
    expect(createResult.success).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.agents', 'skills', 'api-optimizer', 'SKILL.md'))).toBe(true);

    // 2. Skill Add from Built-in Catalog (antigravity-handoff & security-auditor)
    const addHandoff = await executeSkillAdd({
      dir: testDir,
      target: 'antigravity-handoff',
    });
    expect(addHandoff.success).toBe(true);
    expect(addHandoff.source).toBe('catalog');
    expect(fs.existsSync(path.join(testDir, '.agents', 'skills', 'antigravity-handoff', 'SKILL.md'))).toBe(true);

    const addSecurity = await executeSkillAdd({
      dir: testDir,
      target: 'security-auditor',
    });
    expect(addSecurity.success).toBe(true);

    // 3. Skill List (Inspect Installed Skills)
    const listResult = await executeSkillList({ dir: testDir });
    expect(listResult.skills.length).toBeGreaterThanOrEqual(4); // workspace-init + api-optimizer + antigravity-handoff + security-auditor
    const names = listResult.skills.map((s) => s.name);
    expect(names).toContain('workspace-init');
    expect(names).toContain('api-optimizer');
    expect(names).toContain('antigravity-handoff');
    expect(names).toContain('security-auditor');

    // 4. Verify config.yaml synchronization
    const configContent = fs.readFileSync(path.join(testDir, '.agents', 'config.yaml'), 'utf8');
    expect(configContent).toContain('api-optimizer');
    expect(configContent).toContain('antigravity-handoff');
    expect(configContent).toContain('security-auditor');

    // 5. Skill Remove (Clean Deletion)
    const removeResult = await executeSkillRemove({
      dir: testDir,
      name: 'api-optimizer',
    });
    expect(removeResult.success).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.agents', 'skills', 'api-optimizer'))).toBe(false);
  });

  it('Pillar 4: Ephemeral Git Worktree Engine executes real-world create, list, merge, and remove', async () => {
    // 1. Create Worktree for isolated task
    const createRes = await createWorktree({
      taskId: 'dogfood-task-42',
      baseBranch: 'main',
      cwd: testDir,
    });

    expect(createRes.branch).toBe('task/dogfood-task-42');
    expect(fs.existsSync(createRes.path)).toBe(true);

    // 2. Perform isolated commit in worktree
    const featureFile = path.join(createRes.path, 'feature.txt');
    await fs.promises.writeFile(featureFile, 'Dogfood feature content\n');
    await execFileAsync('git', ['add', '.'], { cwd: createRes.path });
    await execFileAsync('git', ['commit', '-m', 'feat: add dogfood feature'], { cwd: createRes.path });

    // 3. List Worktrees
    const worktreeList = await listWorktrees({ cwd: testDir });
    expect(worktreeList.length).toBeGreaterThanOrEqual(2);
    expect(worktreeList.some((w) => w.branch?.includes('dogfood-task-42'))).toBe(true);

    // 4. Merge Worktree into main (fast-forward)
    const mergeRes = await mergeWorktree({
      taskId: 'dogfood-task-42',
      targetBranch: 'main',
      strategy: 'fast-forward',
      cwd: testDir,
    });

    expect(mergeRes.success).toBe(true);
    expect(mergeRes.hasConflicts).toBe(false);

    // Verify main branch now contains the feature file
    expect(fs.existsSync(path.join(testDir, 'feature.txt'))).toBe(true);

    // 5. Remove Worktree and delete branch
    await removeWorktree({
      taskId: 'dogfood-task-42',
      deleteBranch: true,
      cwd: testDir,
    });

    // Verify worktree folder is gone
    expect(fs.existsSync(createRes.path)).toBe(false);

    // Verify branch is deleted
    const branchCheck = await execFileAsync('git', ['branch', '--list', 'task/dogfood-task-42'], {
      cwd: testDir,
    });
    expect(branchCheck.stdout.trim()).toBe('');
  });
});
