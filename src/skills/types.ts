import type { SkillFrontmatter } from '../core/index.js';
import type { BuildResult } from '../commands/build.js';

export interface CatalogSkillDefinition {
  name: string;
  description: string;
  version: string;
  entrypoint?: string;
  compatibility?: string[] | string | Record<string, unknown>;
  content: string;
  aliases?: string[];
  tags?: string[];
  author?: string;
}

export interface ResolvedSkillPayload {
  name: string;
  description: string;
  version?: string;
  entrypoint?: string;
  compatibility?: unknown;
  body: string;
  rawContent: string;
  source: 'catalog' | 'local' | 'remote';
  sourceLocation?: string;
}

export interface InstalledSkillInfo {
  name: string;
  description: string;
  version?: string;
  entrypoint?: string;
  compatibility?: unknown;
  path: string;
  source?: string;
  valid: boolean;
  errors?: string[];
  body: string;
}

export interface CatalogSkillInfo {
  name: string;
  description: string;
  version: string;
  installed: boolean;
  aliases?: string[];
  tags?: string[];
}

export interface SkillAddOptions {
  nameOrSource?: string;
  target?: string;
  source?: string;
  name?: string;
  rootDir?: string;
  dir?: string;
  agentsDir?: string;
  force?: boolean;
  build?: boolean;
  autoBuild?: boolean;
  targets?: string[];
  strict?: boolean;
}

export interface SkillAddResult {
  success: boolean;
  name: string;
  path: string;
  version?: string;
  source: string;
  buildResult?: BuildResult;
}

export interface SkillCreateOptions {
  name: string;
  description?: string;
  version?: string;
  entrypoint?: string;
  compatibility?: string[] | string | Record<string, unknown>;
  template?: 'progressive' | 'standard' | 'minimal';
  tags?: string[];
  body?: string;
  rootDir?: string;
  dir?: string;
  agentsDir?: string;
  force?: boolean;
  build?: boolean;
  autoBuild?: boolean;
  targets?: string[];
  strict?: boolean;
}

export interface SkillCreateResult {
  success: boolean;
  name: string;
  path: string;
  version: string;
  buildResult?: BuildResult;
}

export interface SkillListOptions {
  rootDir?: string;
  dir?: string;
  agentsDir?: string;
  includeCatalog?: boolean;
}

export interface SkillListResult {
  skills: InstalledSkillInfo[];
  catalog?: CatalogSkillInfo[];
  total: number;
}

export interface SkillRemoveOptions {
  name: string;
  rootDir?: string;
  dir?: string;
  agentsDir?: string;
  build?: boolean;
  autoBuild?: boolean;
  targets?: string[];
  strict?: boolean;
}

export interface SkillRemoveResult {
  success: boolean;
  name: string;
  removedPaths: string[];
  buildResult?: BuildResult;
}
