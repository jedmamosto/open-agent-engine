import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { ConfigSchema, type Config } from '../core/index.js';

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export function findConfigFile(agentsDir: string): { path: string; exists: boolean } {
  const yamlPath = path.join(agentsDir, 'config.yaml');
  const ymlPath = path.join(agentsDir, 'config.yml');
  return { path: yamlPath, exists: false };
}

export async function readOrCreateConfig(agentsDir: string): Promise<{
  config: Config;
  filePath: string;
  isNew: boolean;
}> {
  const yamlPath = path.join(agentsDir, 'config.yaml');
  const ymlPath = path.join(agentsDir, 'config.yml');

  if (await pathExists(yamlPath)) {
    const raw = await fs.readFile(yamlPath, 'utf8');
    const parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
    const validated = ConfigSchema.parse(parsed);
    return { config: validated, filePath: yamlPath, isNew: false };
  }

  if (await pathExists(ymlPath)) {
    const raw = await fs.readFile(ymlPath, 'utf8');
    const parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
    const validated = ConfigSchema.parse(parsed);
    return { config: validated, filePath: ymlPath, isNew: false };
  }

  // Create default
  const defaultConfig: Config = {
    version: '1.0.0',
    targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
    registry: {
      skills: [],
    },
    paths: {
      personas: '.agents/personas',
      rules: '.agents/rules',
      skills: '.agents/skills',
      hooks: '.agents/hooks',
    },
    skills: {},
  };

  return { config: defaultConfig, filePath: yamlPath, isNew: true };
}

export async function addSkillToConfig(
  agentsDir: string,
  skillName: string,
  meta: { source?: string; version?: string } = {}
): Promise<void> {
  await fs.mkdir(agentsDir, { recursive: true });
  const { filePath } = await readOrCreateConfig(agentsDir);

  let rawConfig: Record<string, any> = {};
  if (await pathExists(filePath)) {
    const content = await fs.readFile(filePath, 'utf8');
    rawConfig = (YAML.parse(content) || {}) as Record<string, any>;
  } else {
    rawConfig = {
      version: '1.0.0',
      targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
      paths: {
        personas: '.agents/personas',
        rules: '.agents/rules',
        skills: '.agents/skills',
        hooks: '.agents/hooks',
      },
    };
  }

  // Update skills record
  if (!rawConfig.skills || typeof rawConfig.skills !== 'object') {
    rawConfig.skills = {};
  }
  rawConfig.skills[skillName] = {
    source: meta.source || 'local',
    version: meta.version || '1.0.0',
  };

  // Update registry.skills array if present
  if (rawConfig.registry && Array.isArray(rawConfig.registry.skills)) {
    if (!rawConfig.registry.skills.includes(skillName)) {
      rawConfig.registry.skills.push(skillName);
    }
  }

  const updatedYaml = YAML.stringify(rawConfig, { indent: 2 });
  await fs.writeFile(filePath, updatedYaml, 'utf8');
}

export async function removeSkillFromConfig(
  agentsDir: string,
  skillName: string
): Promise<void> {
  const yamlPath = path.join(agentsDir, 'config.yaml');
  const ymlPath = path.join(agentsDir, 'config.yml');

  let targetPath: string | undefined;
  if (await pathExists(yamlPath)) {
    targetPath = yamlPath;
  } else if (await pathExists(ymlPath)) {
    targetPath = ymlPath;
  }

  if (!targetPath) {
    return;
  }

  const content = await fs.readFile(targetPath, 'utf8');
  const rawConfig = (YAML.parse(content) || {}) as Record<string, any>;

  let modified = false;

  if (rawConfig.skills && typeof rawConfig.skills === 'object' && skillName in rawConfig.skills) {
    delete rawConfig.skills[skillName];
    modified = true;
  }

  if (rawConfig.registry && Array.isArray(rawConfig.registry.skills)) {
    const originalLength = rawConfig.registry.skills.length;
    rawConfig.registry.skills = rawConfig.registry.skills.filter((s: string) => s !== skillName);
    if (rawConfig.registry.skills.length !== originalLength) {
      modified = true;
    }
  }

  if (modified) {
    const updatedYaml = YAML.stringify(rawConfig, { indent: 2 });
    await fs.writeFile(targetPath, updatedYaml, 'utf8');
  }
}
