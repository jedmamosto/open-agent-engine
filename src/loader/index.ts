import fs from 'node:fs/promises';
import path from 'node:path';
import {
  parseYaml,
  parseFrontmatter,
  validateAgentsProject,
  ConfigSchema,
  PersonaSchema,
  RuleSchema,
  HookSchema,
  SkillFrontmatterSchema,
  type Config,
  type Persona,
  type Rule,
  type Hook,
  type AgentsProjectAST,
  type ValidationResult,
  type DiagnosticIssue,
} from '../core/index.js';
import type {
  LoadedProjectResult,
  ResolvedAgentsProject,
  ResolvedSkill,
} from '../adapters/types.js';

export interface LoaderOptions {
  agentsDir?: string;
  strict?: boolean;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
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

async function listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Loads and validates an .agents/ workspace project from the filesystem.
 */
export async function loadAgentsProject(
  rootDir: string,
  options?: LoaderOptions
): Promise<LoadedProjectResult> {
  const agentsDirName = options?.agentsDir || '.agents';
  const agentsRoot = path.isAbsolute(agentsDirName)
    ? agentsDirName
    : path.join(rootDir, agentsDirName);

  // 1. Load config.yaml / config.yml
  let config: Config = ConfigSchema.parse({});
  const configYamlPath = path.join(agentsRoot, 'config.yaml');
  const configYmlPath = path.join(agentsRoot, 'config.yml');

  if (await pathExists(configYamlPath)) {
    const content = await fs.readFile(configYamlPath, 'utf8');
    const parsed = parseYaml(content, ConfigSchema);
    if (parsed.success) {
      config = parsed.data;
    }
  } else if (await pathExists(configYmlPath)) {
    const content = await fs.readFile(configYmlPath, 'utf8');
    const parsed = parseYaml(content, ConfigSchema);
    if (parsed.success) {
      config = parsed.data;
    }
  }

  // Resolve sub-paths (can be overridden by config.paths)
  const personasDir = path.isAbsolute(config.paths.personas)
    ? config.paths.personas
    : path.join(rootDir, config.paths.personas);

  const rulesDir = path.isAbsolute(config.paths.rules)
    ? config.paths.rules
    : path.join(rootDir, config.paths.rules);

  const hooksDir = path.isAbsolute(config.paths.hooks)
    ? config.paths.hooks
    : path.join(rootDir, config.paths.hooks);

  const skillsDir = path.isAbsolute(config.paths.skills)
    ? config.paths.skills
    : path.join(rootDir, config.paths.skills);

  // 2. Load Personas
  const personas: Persona[] = [];
  const rawPersonas: unknown[] = [];
  const personaFiles = await listFiles(personasDir);
  for (const file of personaFiles) {
    const fullPath = path.join(personasDir, file);
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const parsed = parseYaml(content);
      if (parsed.success) {
        rawPersonas.push(parsed.data);
        const valid = PersonaSchema.safeParse(parsed.data);
        if (valid.success) {
          personas.push(valid.data);
        }
      }
    } else if (file.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const fm = parseFrontmatter(content);
      const fileId = path.basename(file, path.extname(file));
      const personaObj: Record<string, unknown> = {
        id: (fm.frontmatter as Record<string, unknown>).id || fileId,
        ...(fm.frontmatter as Record<string, unknown>),
      };
      if (!personaObj.system_prompt && fm.body.trim()) {
        personaObj.system_prompt = fm.body.trim();
      }
      rawPersonas.push(personaObj);
      const valid = PersonaSchema.safeParse(personaObj);
      if (valid.success) {
        personas.push(valid.data);
      }
    }
  }

  // 3. Load Rules
  const rules: Rule[] = [];
  const rawRules: unknown[] = [];
  const ruleFiles = await listFiles(rulesDir);
  for (const file of ruleFiles) {
    const fullPath = path.join(rulesDir, file);
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const parsed = parseYaml(content);
      if (parsed.success) {
        rawRules.push(parsed.data);
        const valid = RuleSchema.safeParse(parsed.data);
        if (valid.success) {
          rules.push(valid.data);
        }
      }
    } else if (file.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const fm = parseFrontmatter(content);
      const fileId = path.basename(file, path.extname(file));
      const ruleObj: Record<string, unknown> = {
        id: (fm.frontmatter as Record<string, unknown>).id || fileId,
        ...(fm.frontmatter as Record<string, unknown>),
      };
      if (!ruleObj.content && fm.body.trim()) {
        ruleObj.content = fm.body.trim();
      }
      rawRules.push(ruleObj);
      const valid = RuleSchema.safeParse(ruleObj);
      if (valid.success) {
        rules.push(valid.data);
      }
    }
  }

  // 4. Load Hooks
  const hooks: Hook[] = [];
  const rawHooks: unknown[] = [];
  const hookFiles = await listFiles(hooksDir);
  for (const file of hookFiles) {
    const fullPath = path.join(hooksDir, file);
    if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const parsed = parseYaml(content);
      if (parsed.success) {
        const raw = parsed.data;
        const items = Array.isArray(raw)
          ? raw
          : (raw && typeof raw === 'object' && 'hooks' in (raw as Record<string, unknown>) && Array.isArray((raw as Record<string, unknown>).hooks))
            ? (raw as Record<string, unknown>).hooks as unknown[]
            : [raw];

        for (const item of items) {
          rawHooks.push(item);
          const valid = HookSchema.safeParse(item);
          if (valid.success) {
            hooks.push(valid.data);
          }
        }
      }
    }
  }

  // 5. Load Skills
  const skills: ResolvedSkill[] = [];
  const rawSkills: unknown[] = [];

  // 5a. Check subdirectories: .agents/skills/<name>/SKILL.md
  const skillSubdirs = await listDirs(skillsDir);
  for (const sub of skillSubdirs) {
    const skillMdPath = path.join(skillsDir, sub, 'SKILL.md');
    if (await pathExists(skillMdPath)) {
      const content = await fs.readFile(skillMdPath, 'utf8');
      try {
        const fm = parseFrontmatter(content, SkillFrontmatterSchema);
        rawSkills.push(fm.frontmatter);
        skills.push({
          name: fm.frontmatter.name,
          description: fm.frontmatter.description,
          version: fm.frontmatter.version,
          entrypoint: fm.frontmatter.entrypoint,
          compatibility: fm.frontmatter.compatibility,
          body: fm.body,
          path: path.join(skillsDir, sub, 'SKILL.md'),
        });
      } catch {
        // Unparseable frontmatter will be caught during validation
      }
    }
  }

  // 5b. Also check direct markdown files in skills dir: .agents/skills/<name>.md
  const skillDirectFiles = await listFiles(skillsDir);
  for (const file of skillDirectFiles) {
    if (file.endsWith('.md') && file.toUpperCase() !== 'SKILL.MD') {
      const skillFilePath = path.join(skillsDir, file);
      const content = await fs.readFile(skillFilePath, 'utf8');
      try {
        const fm = parseFrontmatter(content, SkillFrontmatterSchema);
        rawSkills.push(fm.frontmatter);
        skills.push({
          name: fm.frontmatter.name,
          description: fm.frontmatter.description,
          version: fm.frontmatter.version,
          entrypoint: fm.frontmatter.entrypoint,
          compatibility: fm.frontmatter.compatibility,
          body: fm.body,
          path: skillFilePath,
        });
      } catch {
        // Ignored
      }
    }
  }

  // Build raw AST for project-wide validation
  const rawAst: AgentsProjectAST = {
    config,
    personas: rawPersonas,
    rules: rawRules,
    hooks: rawHooks,
    skills: rawSkills,
  };

  const validation: ValidationResult = validateAgentsProject(rawAst);

  const resolvedProject: ResolvedAgentsProject = {
    config,
    personas,
    rules,
    hooks,
    skills,
  };

  return {
    ast: resolvedProject,
    validation,
    rawAst,
  };
}

/**
 * Formats validation diagnostic errors and warnings for display.
 */
export function formatDiagnostics(validation: ValidationResult): string {
  const lines: string[] = [];

  if (validation.errors.length > 0) {
    lines.push(`Errors (${validation.errors.length}):`);
    for (const err of validation.errors) {
      lines.push(`  ✖ [${err.code}] ${err.message}${err.path ? ` (path: ${err.path})` : ''}`);
    }
  }

  if (validation.warnings.length > 0) {
    lines.push(`Warnings (${validation.warnings.length}):`);
    for (const warn of validation.warnings) {
      lines.push(`  ⚠ [${warn.code}] ${warn.message}${warn.path ? ` (path: ${warn.path})` : ''}`);
    }
  }

  return lines.join('\n');
}
