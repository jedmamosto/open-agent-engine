import fs from 'node:fs/promises';
import path from 'node:path';
import {
  normalizeTarget,
  type CanonicalTarget,
  type Target,
} from 'open-agent-engine-core';
import { loadAgentsProject, formatDiagnostics } from '../loader/index.js';
import { defaultAdapterRegistry, AdapterRegistry } from '../adapters/registry.js';
import type {
  CompiledFile,
  LoadedProjectResult,
} from '../adapters/types.js';
import { normalizePathSeparators } from '../adapters/utils.js';

export interface BuildOptions {
  rootDir?: string;
  targets?: string[];
  dryRun?: boolean;
  writeFiles?: boolean;
  registry?: AdapterRegistry;
  agentsDir?: string;
  strict?: boolean;
}

export interface BuildTargetResult {
  target: CanonicalTarget;
  adapterName: string;
  files: CompiledFile[];
  durationMs: number;
}

export interface BuildResult {
  success: boolean;
  totalFiles: number;
  durationMs: number;
  targets: BuildTargetResult[];
  loadedProject: LoadedProjectResult;
  writtenPaths: string[];
}

export class BuildValidationError extends Error {
  public readonly loadedProject: LoadedProjectResult;

  constructor(message: string, loadedProject: LoadedProjectResult) {
    super(message);
    this.name = 'BuildValidationError';
    this.loadedProject = loadedProject;
  }
}

/**
 * Executes the cross-platform adapter build pipeline.
 */
export async function executeBuild(options: BuildOptions = {}): Promise<BuildResult> {
  const startTime = Date.now();
  const rootDir = options.rootDir || process.cwd();
  const registry = options.registry || defaultAdapterRegistry;
  const isDryRun = options.dryRun === true;
  const shouldWrite = options.writeFiles !== undefined ? options.writeFiles : !isDryRun;

  // 1. Load and validate project AST from filesystem
  const loadedProject = await loadAgentsProject(rootDir, {
    agentsDir: options.agentsDir,
    strict: options.strict,
  });

  // 2. Check for blocking validation errors
  if (!loadedProject.validation.valid) {
    const errorDetails = formatDiagnostics(loadedProject.validation);
    if (options.strict !== false && loadedProject.validation.errors.length > 0) {
      throw new BuildValidationError(
        `Project validation failed with ${loadedProject.validation.errors.length} error(s):\n${errorDetails}`,
        loadedProject
      );
    }
  }

  // 3. Resolve target list
  const requestedTargets = options.targets && options.targets.length > 0
    ? options.targets
    : (loadedProject.ast.config.targets as string[]) || ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'];

  // Normalize targets and deduplicate
  const resolvedCanonicalTargets: CanonicalTarget[] = [];
  const seen = new Set<CanonicalTarget>();

  for (const rawTarget of requestedTargets) {
    try {
      const canonical = normalizeTarget(rawTarget);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        resolvedCanonicalTargets.push(canonical);
      }
    } catch {
      // Ignore unknown target or handle warning
    }
  }

  // 4. Compile with each target adapter
  const targetResults: BuildTargetResult[] = [];
  const writtenPaths: string[] = [];
  let totalFiles = 0;

  for (const targetName of resolvedCanonicalTargets) {
    const adapter = registry.get(targetName);
    if (!adapter) {
      continue;
    }

    const targetStart = Date.now();
    const compiledFiles = await adapter.compile(loadedProject.ast, {
      rootDir,
      target: targetName,
      dryRun: isDryRun,
    });
    const targetDuration = Date.now() - targetStart;

    // Normalize relative paths with forward slashes
    const normalizedFiles = compiledFiles.map((file) => ({
      ...file,
      path: normalizePathSeparators(file.path),
    }));

    totalFiles += normalizedFiles.length;
    targetResults.push({
      target: targetName,
      adapterName: adapter.name,
      files: normalizedFiles,
      durationMs: targetDuration,
    });

    // 5. Write files to disk if enabled
    if (shouldWrite) {
      for (const file of normalizedFiles) {
        const absolutePath = path.join(rootDir, file.path);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, file.content, 'utf8');
        writtenPaths.push(normalizePathSeparators(path.relative(rootDir, absolutePath)));
      }
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    totalFiles,
    durationMs,
    targets: targetResults,
    loadedProject,
    writtenPaths,
  };
}
