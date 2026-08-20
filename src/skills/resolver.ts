import fs from 'node:fs/promises';
import path from 'node:path';
import {
  parseFrontmatter,
  SkillFrontmatterSchema,
  validateSkillFrontmatter,
  type SkillFrontmatter,
} from '../core/index.js';
import { findCatalogSkill } from './catalog.js';
import type { ResolvedSkillPayload } from './types.js';

export class SkillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillError';
  }
}

export class SkillNotFoundError extends SkillError {
  constructor(skillNameOrSource: string) {
    super(`Skill "${skillNameOrSource}" was not found in catalog, local filesystem, or remote registry.`);
    this.name = 'SkillNotFoundError';
  }
}

export class SkillValidationError extends SkillError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'SkillValidationError';
    this.errors = errors;
  }
}

export class SkillAlreadyExistsError extends SkillError {
  constructor(skillName: string, destination: string) {
    super(
      `Skill "${skillName}" is already installed at "${destination}". Use --force to overwrite.`
    );
    this.name = 'SkillAlreadyExistsError';
  }
}

export class SkillFetchError extends SkillError {
  constructor(url: string, status?: number | string) {
    super(`Failed to fetch skill from "${url}"${status ? ` (Status: ${status})` : ''}`);
    this.name = 'SkillFetchError';
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export interface ResolveSkillOptions {
  rootDir?: string;
  fetchFn?: typeof fetch;
}

/**
 * Resolves a skill from catalog, local filesystem, or remote URL.
 */
export async function resolveSkill(
  sourceOrName: string,
  options: ResolveSkillOptions = {}
): Promise<ResolvedSkillPayload> {
  const rootDir = options.rootDir || process.cwd();
  const trimmed = sourceOrName.trim();

  // 1. Check HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const fetchImpl = options.fetchFn || globalThis.fetch;
    if (!fetchImpl) {
      throw new SkillFetchError(trimmed, 'Global fetch is not available in environment');
    }

    try {
      const res = await fetchImpl(trimmed);
      if (!res.ok) {
        throw new SkillFetchError(trimmed, `${res.status} ${res.statusText}`);
      }
      const rawText = await res.text();
      return parseAndValidateSkillText(rawText, 'remote', trimmed);
    } catch (err: unknown) {
      if (err instanceof SkillError) throw err;
      throw new SkillFetchError(trimmed, err instanceof Error ? err.message : String(err));
    }
  }

  // 2. Check local file or directory paths
  const isExplicitPath =
    trimmed.startsWith('.') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    trimmed.endsWith('.md') ||
    trimmed.includes('/') ||
    trimmed.includes('\\');

  if (isExplicitPath) {
    const candidatePath = path.isAbsolute(trimmed) ? trimmed : path.resolve(rootDir, trimmed);
    const resolvedPayload = await tryResolveLocalPath(candidatePath);
    if (resolvedPayload) {
      return resolvedPayload;
    }
  }

  // 3. Check built-in catalog
  const catalogEntry = findCatalogSkill(trimmed);
  if (catalogEntry) {
    return parseAndValidateSkillText(catalogEntry.content, 'catalog', catalogEntry.name);
  }

  // 4. Fallback check for local relative path without explicit path indicators
  const fallbackPath = path.resolve(rootDir, trimmed);
  const fallbackPayload = await tryResolveLocalPath(fallbackPath);
  if (fallbackPayload) {
    return fallbackPayload;
  }

  // 5. Not found anywhere
  throw new SkillNotFoundError(sourceOrName);
}

async function tryResolveLocalPath(filePath: string): Promise<ResolvedSkillPayload | null> {
  if (await pathExists(filePath)) {
    const stat = await fs.stat(filePath);
    let targetFile = filePath;
    if (stat.isDirectory()) {
      targetFile = path.join(filePath, 'SKILL.md');
      if (!(await pathExists(targetFile))) {
        return null;
      }
    }
    const content = await fs.readFile(targetFile, 'utf8');
    return parseAndValidateSkillText(content, 'local', targetFile);
  }
  return null;
}

export function parseAndValidateSkillText(
  rawContent: string,
  source: 'catalog' | 'local' | 'remote',
  sourceLocation?: string
): ResolvedSkillPayload {
  let frontmatter: SkillFrontmatter;
  let body: string;

  try {
    const parsed = parseFrontmatter(rawContent);
    const validation = validateSkillFrontmatter(parsed.frontmatter);

    if (!validation.valid) {
      const errorMsgs = validation.errors.map((e) => e.message);
      throw new SkillValidationError(
        `Invalid skill frontmatter in ${sourceLocation || source}: ${errorMsgs.join('; ')}`,
        errorMsgs
      );
    }

    frontmatter = SkillFrontmatterSchema.parse(parsed.frontmatter);
    body = parsed.body;
  } catch (err: unknown) {
    if (err instanceof SkillError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new SkillValidationError(
      `Failed to parse skill frontmatter in ${sourceLocation || source}: ${msg}`,
      [msg]
    );
  }

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    version: frontmatter.version,
    entrypoint: frontmatter.entrypoint,
    compatibility: frontmatter.compatibility,
    body,
    rawContent,
    source,
    sourceLocation,
  };
}
