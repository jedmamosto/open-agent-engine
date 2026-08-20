import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import {
  executeSkillAdd,
  executeSkillCreate,
  executeSkillList,
  executeSkillRemove,
} from '../../commands/skill.js';
import {
  SkillAlreadyExistsError,
  SkillNotFoundError,
  SkillValidationError,
  SkillFetchError,
  resolveSkill,
} from '../../skills/resolver.js';
import { listCatalogSkills, findCatalogSkill } from '../../skills/catalog.js';

describe('Skill Package Manager & Hub', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-engine-skill-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function setupMinimalProject(dir: string): Promise<void> {
    const agentsDir = path.join(dir, '.agents');
    await fs.mkdir(path.join(agentsDir, 'personas'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'rules'), { recursive: true });

    await fs.writeFile(
      path.join(agentsDir, 'config.yaml'),
      `version: "1.0.0"\nproject:\n  name: "skill-test-repo"\ntargets:\n  - claude\n  - cursor\nskills:\n  existing-skill:\n    source: "local"\n    version: "1.0.0"\n`
    );

    await fs.writeFile(
      path.join(agentsDir, 'personas', 'architect.yaml'),
      `id: architect\nname: Software Architect\nsystem_prompt: "Lead Architect."\n`
    );
  }

  describe('Built-in Catalog Definitions', () => {
    it('provides all 5 required built-in skills', () => {
      const catalog = listCatalogSkills();
      const names = catalog.map((c) => c.name);

      expect(names).toContain('workspace-init');
      expect(names).toContain('subagent-coordinator');
      expect(names).toContain('antigravity-handoff');
      expect(names).toContain('code-reviewer');
      expect(names).toContain('security-auditor');
    });

    it('resolves catalog items by aliases', () => {
      expect(findCatalogSkill('handoff')?.name).toBe('antigravity-handoff');
      expect(findCatalogSkill('coordinator')?.name).toBe('subagent-coordinator');
      expect(findCatalogSkill('reviewer')?.name).toBe('code-reviewer');
      expect(findCatalogSkill('security')?.name).toBe('security-auditor');
      expect(findCatalogSkill('init')?.name).toBe('workspace-init');
    });
  });

  describe('executeSkillCreate', () => {
    it('scaffolds a bespoke skill with progressive disclosure template and updates config', async () => {
      await setupMinimalProject(tmpDir);

      const result = await executeSkillCreate({
        name: 'perf-optimizer',
        description: 'Analyzes CPU profiles and memory allocations.',
        version: '1.2.0',
        template: 'progressive',
        rootDir: tmpDir,
      });

      expect(result.success).toBe(true);
      expect(result.name).toBe('perf-optimizer');
      expect(result.version).toBe('1.2.0');

      // Verify file on disk
      const skillMd = await fs.readFile(result.path, 'utf8');
      expect(skillMd).toContain('name: perf-optimizer');
      expect(skillMd).toContain('version: 1.2.0');
      expect(skillMd).toContain('## Level 1: Overview');
      expect(skillMd).toContain('## Level 2: Execution Workflows');
      expect(skillMd).toContain('## Level 3: Rules, Schemas & Reference');

      // Verify config.yaml update
      const configRaw = await fs.readFile(path.join(tmpDir, '.agents', 'config.yaml'), 'utf8');
      const configParsed = YAML.parse(configRaw);
      expect(configParsed.skills['perf-optimizer']).toEqual({
        source: 'local',
        version: '1.2.0',
      });
      // Verify existing skills preserved
      expect(configParsed.skills['existing-skill']).toBeDefined();
    });

    it('scaffolds minimal and standard templates correctly', async () => {
      await setupMinimalProject(tmpDir);

      const resMinimal = await executeSkillCreate({
        name: 'min-skill',
        template: 'minimal',
        rootDir: tmpDir,
      });
      const minMd = await fs.readFile(resMinimal.path, 'utf8');
      expect(minMd).toContain('# Skill: min-skill');
      expect(minMd).not.toContain('## Level 1:');

      const resStandard = await executeSkillCreate({
        name: 'std-skill',
        template: 'standard',
        rootDir: tmpDir,
      });
      const stdMd = await fs.readFile(resStandard.path, 'utf8');
      expect(stdMd).toContain('## Invariants');
    });

    it('throws SkillAlreadyExistsError when skill exists without force flag', async () => {
      await setupMinimalProject(tmpDir);

      await executeSkillCreate({
        name: 'duplicate-test',
        rootDir: tmpDir,
      });

      await expect(
        executeSkillCreate({
          name: 'duplicate-test',
          rootDir: tmpDir,
          force: false,
        })
      ).rejects.toThrow(SkillAlreadyExistsError);

      // With force: true it should overwrite successfully
      const overwritten = await executeSkillCreate({
        name: 'duplicate-test',
        description: 'Updated description',
        rootDir: tmpDir,
        force: true,
      });
      expect(overwritten.success).toBe(true);
      const content = await fs.readFile(overwritten.path, 'utf8');
      expect(content).toContain('Updated description');
    });

    it('throws SkillValidationError on empty or invalid skill name', async () => {
      await setupMinimalProject(tmpDir);

      await expect(
        executeSkillCreate({
          name: '   ',
          rootDir: tmpDir,
        })
      ).rejects.toThrow(SkillValidationError);
    });

    it('triggers auto-build of target adapters when build: true', async () => {
      await setupMinimalProject(tmpDir);

      const result = await executeSkillCreate({
        name: 'autobuild-skill',
        rootDir: tmpDir,
        build: true,
      });

      expect(result.buildResult).toBeDefined();
      expect(result.buildResult?.success).toBe(true);

      // Verify adapter output written to disk
      const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
      expect(claudeMd).toContain('autobuild-skill');
    });
  });

  describe('executeSkillAdd', () => {
    it('installs built-in catalog skills into .agents/skills/<name>/SKILL.md', async () => {
      await setupMinimalProject(tmpDir);

      const result = await executeSkillAdd({
        nameOrSource: 'subagent-coordinator',
        rootDir: tmpDir,
      });

      expect(result.success).toBe(true);
      expect(result.name).toBe('subagent-coordinator');
      expect(result.source).toBe('catalog');

      const fileContent = await fs.readFile(result.path, 'utf8');
      expect(fileContent).toContain('name: subagent-coordinator');
      expect(fileContent).toContain('Orchestrates, gates, and coordinates');

      // Check config.yaml
      const configRaw = await fs.readFile(path.join(tmpDir, '.agents', 'config.yaml'), 'utf8');
      const configParsed = YAML.parse(configRaw);
      expect(configParsed.skills['subagent-coordinator']).toEqual({
        source: 'catalog',
        version: '1.0.0',
      });
    });

    it('installs catalog skills via alias (e.g. handoff -> antigravity-handoff)', async () => {
      await setupMinimalProject(tmpDir);

      const result = await executeSkillAdd({
        nameOrSource: 'handoff',
        rootDir: tmpDir,
      });

      expect(result.name).toBe('antigravity-handoff');
      const fileContent = await fs.readFile(result.path, 'utf8');
      expect(fileContent).toContain('name: antigravity-handoff');
    });

    it('installs skill from local filesystem path and validates schema', async () => {
      await setupMinimalProject(tmpDir);

      // Create external skill file
      const externalSkillDir = path.join(tmpDir, 'external-skills');
      await fs.mkdir(externalSkillDir, { recursive: true });
      const externalSkillPath = path.join(externalSkillDir, 'custom-tool.md');
      await fs.writeFile(
        externalSkillPath,
        `---\nname: custom-tool\ndescription: External local skill.\nversion: 2.0.0\n---\n# Custom Tool Body\n`
      );

      const result = await executeSkillAdd({
        nameOrSource: externalSkillPath,
        rootDir: tmpDir,
      });

      expect(result.success).toBe(true);
      expect(result.name).toBe('custom-tool');
      expect(result.source).toBe('local');

      const installedContent = await fs.readFile(
        path.join(tmpDir, '.agents', 'skills', 'custom-tool', 'SKILL.md'),
        'utf8'
      );
      expect(installedContent).toContain('name: custom-tool');
      expect(installedContent).toContain('version: 2.0.0');
    });

    it('installs skill from remote URL using fetch', async () => {
      await setupMinimalProject(tmpDir);

      const mockSkillContent = `---
name: cloud-deployer
description: Deploys containers to cloud cluster.
version: 1.0.0
---
# Cloud Deployer
`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => mockSkillContent,
      });

      // Temporarily mock global fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as any;

      try {
        const result = await executeSkillAdd({
          nameOrSource: 'https://skills.agent-engine.dev/cloud-deployer.md',
          rootDir: tmpDir,
        });

        expect(result.success).toBe(true);
        expect(result.name).toBe('cloud-deployer');
        expect(result.source).toBe('remote');

        const fileContent = await fs.readFile(result.path, 'utf8');
        expect(fileContent).toContain('name: cloud-deployer');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('allows overriding destination skill name', async () => {
      await setupMinimalProject(tmpDir);

      const result = await executeSkillAdd({
        nameOrSource: 'code-reviewer',
        name: 'custom-reviewer',
        rootDir: tmpDir,
      });

      expect(result.name).toBe('custom-reviewer');
      expect(result.path).toContain('custom-reviewer');

      const fileContent = await fs.readFile(result.path, 'utf8');
      expect(fileContent).toContain('name: custom-reviewer');
    });

    it('throws SkillAlreadyExistsError when skill already installed without force', async () => {
      await setupMinimalProject(tmpDir);

      await executeSkillAdd({
        nameOrSource: 'security-auditor',
        rootDir: tmpDir,
      });

      await expect(
        executeSkillAdd({
          nameOrSource: 'security-auditor',
          rootDir: tmpDir,
          force: false,
        })
      ).rejects.toThrow(SkillAlreadyExistsError);
    });

    it('throws SkillNotFoundError when skill cannot be resolved', async () => {
      await setupMinimalProject(tmpDir);

      await expect(
        executeSkillAdd({
          nameOrSource: 'non-existent-skill-xyz-123',
          rootDir: tmpDir,
        })
      ).rejects.toThrow(SkillNotFoundError);
    });

    it('throws SkillValidationError when local skill frontmatter fails schema', async () => {
      await setupMinimalProject(tmpDir);

      const invalidSkillPath = path.join(tmpDir, 'invalid-skill.md');
      // Missing required name
      await fs.writeFile(
        invalidSkillPath,
        `---\ndescription: Missing name\n---\n# Body\n`
      );

      await expect(
        executeSkillAdd({
          nameOrSource: invalidSkillPath,
          rootDir: tmpDir,
        })
      ).rejects.toThrow(SkillValidationError);
    });

    it('throws SkillFetchError when remote fetch returns 404', async () => {
      await setupMinimalProject(tmpDir);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '',
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as any;

      try {
        await expect(
          executeSkillAdd({
            nameOrSource: 'https://skills.agent-engine.dev/missing-skill.md',
            rootDir: tmpDir,
          })
        ).rejects.toThrow(SkillFetchError);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('triggers auto-build of target adapter configs when build: true', async () => {
      await setupMinimalProject(tmpDir);

      const result = await executeSkillAdd({
        nameOrSource: 'security-auditor',
        rootDir: tmpDir,
        build: true,
      });

      expect(result.buildResult).toBeDefined();
      expect(result.buildResult?.success).toBe(true);

      const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
      expect(claudeMd).toContain('security-auditor');
    });
  });

  describe('executeSkillList', () => {
    it('returns all installed skills and parses their frontmatter', async () => {
      await setupMinimalProject(tmpDir);

      await executeSkillAdd({
        nameOrSource: 'workspace-init',
        rootDir: tmpDir,
      });
      await executeSkillCreate({
        name: 'custom-skill',
        description: 'Bespoke project skill',
        rootDir: tmpDir,
      });

      const listResult = await executeSkillList({ rootDir: tmpDir });

      expect(listResult.total).toBeGreaterThanOrEqual(2);
      const names = listResult.skills.map((s) => s.name);
      expect(names).toContain('workspace-init');
      expect(names).toContain('custom-skill');

      const wsInit = listResult.skills.find((s) => s.name === 'workspace-init');
      expect(wsInit?.valid).toBe(true);
      expect(wsInit?.description).toContain('Automated workspace bootstrap');
      expect(wsInit?.source).toBe('catalog');
    });

    it('detects direct .md files in .agents/skills/ directory', async () => {
      await setupMinimalProject(tmpDir);

      const directSkillPath = path.join(tmpDir, '.agents', 'skills', 'direct-helper.md');
      await fs.mkdir(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
      await fs.writeFile(
        directSkillPath,
        `---\nname: direct-helper\ndescription: Standalone direct markdown skill\nversion: 1.0.0\n---\n# Helper\n`
      );

      const listResult = await executeSkillList({ rootDir: tmpDir });
      const helper = listResult.skills.find((s) => s.name === 'direct-helper');
      expect(helper).toBeDefined();
      expect(helper?.valid).toBe(true);
      expect(helper?.description).toBe('Standalone direct markdown skill');
    });

    it('includes catalog skills with installed boolean when includeCatalog is true', async () => {
      await setupMinimalProject(tmpDir);

      await executeSkillAdd({
        nameOrSource: 'code-reviewer',
        rootDir: tmpDir,
      });

      const listResult = await executeSkillList({
        rootDir: tmpDir,
        includeCatalog: true,
      });

      expect(listResult.catalog).toBeDefined();
      expect(listResult.catalog?.length).toBe(5);

      const reviewerInCatalog = listResult.catalog?.find((c) => c.name === 'code-reviewer');
      expect(reviewerInCatalog?.installed).toBe(true);

      const handoffInCatalog = listResult.catalog?.find((c) => c.name === 'antigravity-handoff');
      expect(handoffInCatalog?.installed).toBe(false);
    });

    it('identifies invalid skill files gracefully', async () => {
      await setupMinimalProject(tmpDir);

      const brokenDir = path.join(tmpDir, '.agents', 'skills', 'broken-skill');
      await fs.mkdir(brokenDir, { recursive: true });
      // Invalid YAML frontmatter
      await fs.writeFile(
        path.join(brokenDir, 'SKILL.md'),
        `---\n: : broken yaml\n---\n# Body`
      );

      const listResult = await executeSkillList({ rootDir: tmpDir });
      const broken = listResult.skills.find((s) => s.name === 'broken-skill');
      expect(broken).toBeDefined();
      expect(broken?.valid).toBe(false);
      expect(broken?.errors).toBeDefined();
    });
  });

  describe('executeSkillRemove', () => {
    it('deletes skill directory and updates .agents/config.yaml', async () => {
      await setupMinimalProject(tmpDir);

      await executeSkillAdd({
        nameOrSource: 'workspace-init',
        rootDir: tmpDir,
      });

      const skillDir = path.join(tmpDir, '.agents', 'skills', 'workspace-init');
      expect(await fs.access(skillDir).then(() => true).catch(() => false)).toBe(true);

      const removeResult = await executeSkillRemove({
        name: 'workspace-init',
        rootDir: tmpDir,
      });

      expect(removeResult.success).toBe(true);
      expect(removeResult.name).toBe('workspace-init');

      // Verify directory removed
      expect(await fs.access(skillDir).then(() => true).catch(() => false)).toBe(false);

      // Verify config.yaml cleaned
      const configRaw = await fs.readFile(path.join(tmpDir, '.agents', 'config.yaml'), 'utf8');
      const configParsed = YAML.parse(configRaw);
      expect(configParsed.skills?.['workspace-init']).toBeUndefined();
    });

    it('deletes direct .md skill file if present', async () => {
      await setupMinimalProject(tmpDir);

      const directPath = path.join(tmpDir, '.agents', 'skills', 'standalone.md');
      await fs.mkdir(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
      await fs.writeFile(
        directPath,
        `---\nname: standalone\ndescription: Standalone\n---\n# Doc\n`
      );

      const removeResult = await executeSkillRemove({
        name: 'standalone',
        rootDir: tmpDir,
      });

      expect(removeResult.success).toBe(true);
      expect(await fs.access(directPath).then(() => true).catch(() => false)).toBe(false);
    });

    it('throws SkillNotFoundError when attempting to remove non-existent skill', async () => {
      await setupMinimalProject(tmpDir);

      await expect(
        executeSkillRemove({
          name: 'non-existent-skill',
          rootDir: tmpDir,
        })
      ).rejects.toThrow(SkillNotFoundError);
    });

    it('triggers auto-build of target adapters on removal when build: true', async () => {
      await setupMinimalProject(tmpDir);

      await executeSkillAdd({
        nameOrSource: 'code-reviewer',
        rootDir: tmpDir,
        build: true,
      });

      const removeResult = await executeSkillRemove({
        name: 'code-reviewer',
        rootDir: tmpDir,
        build: true,
      });

      expect(removeResult.buildResult).toBeDefined();
      expect(removeResult.buildResult?.success).toBe(true);

      const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
      expect(claudeMd).not.toContain('code-reviewer:');
    });
  });

  describe('resolveSkill Edge Cases', () => {
    it('resolves skill from a directory containing SKILL.md', async () => {
      const customDir = path.join(tmpDir, 'my-local-skill');
      await fs.mkdir(customDir, { recursive: true });
      await fs.writeFile(
        path.join(customDir, 'SKILL.md'),
        `---\nname: my-local-skill\ndescription: Custom directory skill\nversion: 1.1.0\n---\n# Content`
      );

      const resolved = await resolveSkill(customDir, { rootDir: tmpDir });
      expect(resolved.name).toBe('my-local-skill');
      expect(resolved.source).toBe('local');
      expect(resolved.version).toBe('1.1.0');
    });
  });
});
