import fs from 'node:fs/promises';
import path from 'node:path';
import {
  parseFrontmatter,
  validateSkillFrontmatter,
  SkillFrontmatterSchema,
  type SkillFrontmatter,
} from '@agent-engine/core';
import { executeBuild, type BuildResult } from './build.js';
import {
  resolveSkill,
  SkillAlreadyExistsError,
  SkillNotFoundError,
  SkillValidationError,
} from '../skills/resolver.js';
import {
  addSkillToConfig,
  removeSkillFromConfig,
  readOrCreateConfig,
} from '../skills/config-updater.js';
import { generateSkillMarkdown } from '../skills/templates.js';
import { listCatalogSkills } from '../skills/catalog.js';
import type {
  SkillAddOptions,
  SkillAddResult,
  SkillCreateOptions,
  SkillCreateResult,
  SkillListOptions,
  SkillListResult,
  SkillRemoveOptions,
  SkillRemoveResult,
  InstalledSkillInfo,
  CatalogSkillInfo,
} from '../skills/types.js';

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

function resolveAgentsPaths(rootDir: string, agentsDirOption?: string): {
  agentsRoot: string;
  skillsDir: string;
} {
  const agentsDirName = agentsDirOption || '.agents';
  const agentsRoot = path.isAbsolute(agentsDirName)
    ? agentsDirName
    : path.join(rootDir, agentsDirName);
  const skillsDir = path.join(agentsRoot, 'skills');
  return { agentsRoot, skillsDir };
}

/**
 * Installs a skill from the built-in catalog, local path, or remote URL.
 */
export async function executeSkillAdd(options: SkillAddOptions): Promise<SkillAddResult> {
  const rootDir = options.dir || options.rootDir || process.cwd();
  const { agentsRoot, skillsDir } = resolveAgentsPaths(rootDir, options.agentsDir);

  // 1. Resolve skill from catalog, path, or URL
  const sourceOrName = options.nameOrSource || (options as any).target || (options as any).source;
  const resolved = await resolveSkill(sourceOrName, { rootDir });

  // Allow custom name override if specified
  const skillName = options.name || resolved.name;

  // 2. Validate frontmatter against SkillFrontmatterSchema
  let finalContent = resolved.rawContent;
  if (options.name && options.name !== resolved.name) {
    const { frontmatter, content } = generateSkillMarkdown({
      name: skillName,
      description: resolved.description,
      version: resolved.version,
      entrypoint: resolved.entrypoint,
      compatibility: resolved.compatibility as any,
      body: resolved.body,
    });
    finalContent = content;
  } else {
    // Re-verify schema
    const parsed = parseFrontmatter(finalContent, SkillFrontmatterSchema);
    const valid = validateSkillFrontmatter(parsed.frontmatter);
    if (!valid.valid) {
      throw new SkillValidationError(
        `Skill "${skillName}" failed schema validation: ${valid.errors.map((e) => e.message).join('; ')}`,
        valid.errors.map((e) => e.message)
      );
    }
  }

  // 3. Write skill to destination .agents/skills/<name>/SKILL.md
  const targetDir = path.join(skillsDir, skillName);
  const targetFile = path.join(targetDir, 'SKILL.md');

  if (await pathExists(targetFile)) {
    if (!options.force) {
      throw new SkillAlreadyExistsError(skillName, targetFile);
    }
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetFile, finalContent, 'utf8');

  // 4. Update .agents/config.yaml
  await addSkillToConfig(agentsRoot, skillName, {
    source: resolved.source,
    version: resolved.version || '1.0.0',
  });

  // 5. Trigger auto-build if requested
  let buildResult: BuildResult | undefined;
  const shouldBuild = options.build === true || options.autoBuild === true;
  if (shouldBuild) {
    buildResult = await executeBuild({
      rootDir,
      agentsDir: options.agentsDir,
      targets: options.targets,
      strict: options.strict,
    });
  }

  return {
    success: true,
    name: skillName,
    path: targetFile,
    version: resolved.version,
    source: resolved.source,
    buildResult,
  };
}

/**
 * Scaffolds a new custom skill template in .agents/skills/<name>/SKILL.md.
 */
export async function executeSkillCreate(options: SkillCreateOptions): Promise<SkillCreateResult> {
  const rootDir = options.dir || options.rootDir || process.cwd();
  const { agentsRoot, skillsDir } = resolveAgentsPaths(rootDir, options.agentsDir);
  const skillName = options.name.trim();

  if (!skillName) {
    throw new SkillValidationError('Skill name cannot be empty', ['Skill name is required']);
  }

  const targetDir = path.join(skillsDir, skillName);
  const targetFile = path.join(targetDir, 'SKILL.md');

  if (await pathExists(targetFile)) {
    if (!options.force) {
      throw new SkillAlreadyExistsError(skillName, targetFile);
    }
  }

  // 1. Generate markdown with frontmatter and progressive disclosure template
  const { frontmatter, content } = generateSkillMarkdown({
    name: skillName,
    description: options.description,
    version: options.version || '1.0.0',
    entrypoint: options.entrypoint,
    compatibility: options.compatibility,
    template: options.template || 'progressive',
    body: options.body,
  });

  // 2. Validate frontmatter schema
  const validation = validateSkillFrontmatter(frontmatter);
  if (!validation.valid) {
    throw new SkillValidationError(
      `Failed to create skill "${skillName}": ${validation.errors.map((e) => e.message).join('; ')}`,
      validation.errors.map((e) => e.message)
    );
  }

  // 3. Write file
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetFile, content, 'utf8');

  // 4. Update .agents/config.yaml
  await addSkillToConfig(agentsRoot, skillName, {
    source: 'local',
    version: frontmatter.version || '1.0.0',
  });

  // 5. Trigger auto-build if requested
  let buildResult: BuildResult | undefined;
  const shouldBuild = options.build === true || options.autoBuild === true;
  if (shouldBuild) {
    buildResult = await executeBuild({
      rootDir,
      agentsDir: options.agentsDir,
      targets: options.targets,
      strict: options.strict,
    });
  }

  return {
    success: true,
    name: skillName,
    path: targetFile,
    version: frontmatter.version || '1.0.0',
    buildResult,
  };
}

/**
 * Lists all installed skills in .agents/skills/ and optionally catalog skills.
 */
export async function executeSkillList(options: SkillListOptions = {}): Promise<SkillListResult> {
  const rootDir = options.dir || options.rootDir || process.cwd();
  const { agentsRoot, skillsDir } = resolveAgentsPaths(rootDir, options.agentsDir);

  const { config } = await readOrCreateConfig(agentsRoot);
  const installedSkills: InstalledSkillInfo[] = [];
  const seenSkillNames = new Set<string>();

  // 1. Scan subdirectories: .agents/skills/<name>/SKILL.md
  if (await pathExists(skillsDir)) {
    const subdirs = await listDirs(skillsDir);
    for (const sub of subdirs) {
      const skillMdPath = path.join(skillsDir, sub, 'SKILL.md');
      if (await pathExists(skillMdPath)) {
        const content = await fs.readFile(skillMdPath, 'utf8');
        try {
          const parsed = parseFrontmatter(content);
          const validation = validateSkillFrontmatter(parsed.frontmatter);
          const fm = parsed.frontmatter as Partial<SkillFrontmatter>;

          const name = fm.name || sub;
          seenSkillNames.add(name);

          installedSkills.push({
            name,
            description: fm.description || '',
            version: fm.version,
            entrypoint: fm.entrypoint,
            compatibility: fm.compatibility,
            path: skillMdPath,
            source: config.skills?.[name]?.source || 'local',
            valid: validation.valid,
            errors: validation.valid ? undefined : validation.errors.map((e) => e.message),
            body: parsed.body,
          });
        } catch (err: unknown) {
          seenSkillNames.add(sub);
          installedSkills.push({
            name: sub,
            description: '',
            path: skillMdPath,
            source: config.skills?.[sub]?.source || 'local',
            valid: false,
            errors: [err instanceof Error ? err.message : 'Invalid skill file'],
            body: '',
          });
        }
      }
    }

    // 2. Scan direct markdown files: .agents/skills/<name>.md
    const directFiles = await listFiles(skillsDir);
    for (const file of directFiles) {
      if (file.endsWith('.md') && file.toUpperCase() !== 'SKILL.MD') {
        const baseName = path.basename(file, '.md');
        if (seenSkillNames.has(baseName)) continue;

        const fullPath = path.join(skillsDir, file);
        const content = await fs.readFile(fullPath, 'utf8');
        try {
          const parsed = parseFrontmatter(content);
          const validation = validateSkillFrontmatter(parsed.frontmatter);
          const fm = parsed.frontmatter as Partial<SkillFrontmatter>;
          const name = fm.name || baseName;
          seenSkillNames.add(name);

          installedSkills.push({
            name,
            description: fm.description || '',
            version: fm.version,
            entrypoint: fm.entrypoint,
            compatibility: fm.compatibility,
            path: fullPath,
            source: config.skills?.[name]?.source || 'local',
            valid: validation.valid,
            errors: validation.valid ? undefined : validation.errors.map((e) => e.message),
            body: parsed.body,
          });
        } catch (err: unknown) {
          seenSkillNames.add(baseName);
          installedSkills.push({
            name: baseName,
            description: '',
            path: fullPath,
            source: config.skills?.[baseName]?.source || 'local',
            valid: false,
            errors: [err instanceof Error ? err.message : 'Invalid skill file'],
            body: '',
          });
        }
      }
    }
  }

  // Also check if any skills in config.skills are missing from disk
  if (config.skills) {
    for (const [cfgName, cfgMeta] of Object.entries(config.skills)) {
      if (!seenSkillNames.has(cfgName)) {
        installedSkills.push({
          name: cfgName,
          description: '(Missing from disk)',
          version: cfgMeta.version,
          path: path.join(skillsDir, cfgName, 'SKILL.md'),
          source: cfgMeta.source || 'unknown',
          valid: false,
          errors: [`Skill file not found at expected path: ${path.join(skillsDir, cfgName, 'SKILL.md')}`],
          body: '',
        });
        seenSkillNames.add(cfgName);
      }
    }
  }

  // 3. Catalog skills if requested
  let catalogList: CatalogSkillInfo[] | undefined;
  if (options.includeCatalog) {
    const catalog = listCatalogSkills();
    catalogList = catalog.map((c) => ({
      name: c.name,
      description: c.description,
      version: c.version,
      installed: seenSkillNames.has(c.name),
      aliases: c.aliases,
      tags: c.tags,
    }));
  }

  return {
    skills: installedSkills,
    catalog: catalogList,
    total: installedSkills.length,
  };
}

/**
 * Removes an installed skill and cleans its registration from .agents/config.yaml.
 */
export async function executeSkillRemove(
  options: SkillRemoveOptions
): Promise<SkillRemoveResult> {
  const rootDir = options.dir || options.rootDir || process.cwd();
  const { agentsRoot, skillsDir } = resolveAgentsPaths(rootDir, options.agentsDir);
  const skillName = options.name.trim();

  if (!skillName) {
    throw new SkillValidationError('Skill name cannot be empty', ['Skill name is required']);
  }

  const targetDir = path.join(skillsDir, skillName);
  const directFile = path.join(skillsDir, `${skillName}.md`);
  const removedPaths: string[] = [];

  const dirExists = await pathExists(targetDir);
  const fileExists = await pathExists(directFile);

  const { config } = await readOrCreateConfig(agentsRoot);
  const inConfig = Boolean(config.skills?.[skillName] || config.registry?.skills?.includes(skillName));

  if (!dirExists && !fileExists && !inConfig) {
    throw new SkillNotFoundError(skillName);
  }

  if (dirExists) {
    await fs.rm(targetDir, { recursive: true, force: true });
    removedPaths.push(targetDir);
  }

  if (fileExists) {
    await fs.rm(directFile, { force: true });
    removedPaths.push(directFile);
  }

  // Clean config.yaml
  await removeSkillFromConfig(agentsRoot, skillName);

  // Trigger auto-build if requested
  let buildResult: BuildResult | undefined;
  const shouldBuild = options.build === true || options.autoBuild === true;
  if (shouldBuild) {
    buildResult = await executeBuild({
      rootDir,
      agentsDir: options.agentsDir,
      targets: options.targets,
      strict: options.strict,
    });
  }

  return {
    success: true,
    name: skillName,
    removedPaths,
    buildResult,
  };
}
