import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import {
  normalizeTarget,
  type CanonicalTarget,
} from 'open-agent-engine-core';
import {
  generateProjectTemplates,
  DEFAULT_TARGETS,
} from '../templates/index.js';
import { executeBuild, type BuildResult } from './build.js';
import { normalizePathSeparators } from '../adapters/utils.js';

export interface InitOptions {
  rootDir?: string;
  dir?: string;
  yes?: boolean;
  targets?: string[] | string;
  name?: string;
  description?: string;
  template?: string;
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun' | string;
  force?: boolean;
  dryRun?: boolean;
  noBuild?: boolean;
  interactive?: boolean;
}

export interface InitResult {
  success: boolean;
  rootDir: string;
  agentsDir: string;
  scaffoldedFiles: string[];
  targets: string[];
  buildResult?: BuildResult;
  isDryRun: boolean;
}

export class InitConflictError extends Error {
  public readonly targetPath: string;

  constructor(message: string, targetPath: string) {
    super(message);
    this.name = 'InitConflictError';
    this.targetPath = targetPath;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseTargetsInput(targetsInput?: string[] | string): string[] | undefined {
  if (!targetsInput) return undefined;
  if (Array.isArray(targetsInput)) {
    return targetsInput.flatMap((t) => t.split(',')).map((t) => t.trim()).filter(Boolean);
  }
  return targetsInput.split(',').map((t) => t.trim()).filter(Boolean);
}

/**
 * Executes the agent-engine interactive scaffolding wizard and project initializer.
 */
export async function executeInit(options: InitOptions = {}): Promise<InitResult> {
  const rootDir = path.resolve(options.dir || options.rootDir || process.cwd());
  const agentsDir = path.join(rootDir, '.agents');
  const isDryRun = options.dryRun === true;

  // Determine interactive mode:
  // Explicit --yes, non-interactive flag, or missing TTY in default mode disables interactive wizard
  const isInteractive =
    options.interactive !== undefined
      ? options.interactive
      : options.yes !== true && Boolean(process.stdin.isTTY);

  let projectName = options.name;
  let projectDescription = options.description;
  let packageManager = options.packageManager;
  let selectedTargets = parseTargetsInput(options.targets);

  const agentsExists = await pathExists(agentsDir);

  if (isInteractive) {
    p.intro(pc.bgCyan(pc.black(' agent-engine init ')));

    // 1. Conflict detection prompt
    if (agentsExists && options.force !== true) {
      const confirmOverwrite = await p.confirm({
        message: pc.yellow(`The directory "${path.relative(process.cwd(), agentsDir) || '.agents'}" already exists. Overwrite?`),
        initialValue: false,
      });

      if (p.isCancel(confirmOverwrite) || !confirmOverwrite) {
        p.cancel('Initialization aborted.');
        throw new InitConflictError(
          `Directory .agents already exists at "${agentsDir}". Use --force to overwrite.`,
          agentsDir
        );
      }
    }

    // 2. Project Name
    if (!projectName) {
      const defaultName = path.basename(rootDir) || 'open-agent-workspace';
      const nameInput = await p.text({
        message: 'What is your project name?',
        placeholder: defaultName,
        defaultValue: defaultName,
        validate: (val) => {
          if (val && !/^[a-zA-Z0-9_-]+$/.test(val)) {
            return 'Project name must only contain alphanumeric characters, hyphens, or underscores';
          }
        },
      });

      if (p.isCancel(nameInput)) {
        p.cancel('Initialization cancelled.');
        throw new Error('Initialization cancelled by user.');
      }
      projectName = nameInput || defaultName;
    }

    // 3. Package Manager
    if (!packageManager) {
      const pmSelect = await p.select({
        message: 'Select package manager:',
        options: [
          { value: 'pnpm', label: 'pnpm (recommended for monorepos)' },
          { value: 'npm', label: 'npm' },
          { value: 'yarn', label: 'yarn' },
          { value: 'bun', label: 'bun' },
        ],
        initialValue: 'pnpm',
      });

      if (p.isCancel(pmSelect)) {
        p.cancel('Initialization cancelled.');
        throw new Error('Initialization cancelled by user.');
      }
      packageManager = pmSelect as string;
    }

    // 4. Target Platforms
    if (!selectedTargets || selectedTargets.length === 0) {
      const targetSelect = await p.multiselect({
        message: 'Select target AI platforms to configure:',
        options: [
          { value: 'claude', label: 'Claude Code (CLAUDE.md + .claude/)' },
          { value: 'cursor', label: 'Cursor (.cursor/rules/*.mdc)' },
          { value: 'windsurf', label: 'Windsurf (.windsurfrules + .windsurf/)' },
          { value: 'roo', label: 'Roo Code (.roomodes + .clinerules)' },
          { value: 'aider', label: 'Aider (.aider.conf.yml + .aider.prompt.md)' },
          { value: 'aaif', label: 'Universal AAIF (AGENTS.md)' },
        ],
        initialValues: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
        required: true,
      });

      if (p.isCancel(targetSelect)) {
        p.cancel('Initialization cancelled.');
        throw new Error('Initialization cancelled by user.');
      }
      selectedTargets = targetSelect as string[];
    }
  } else {
    // Non-interactive conflict detection
    if (agentsExists && options.force !== true) {
      throw new InitConflictError(
        `Destination directory already contains .agents at "${agentsDir}". Use --force to overwrite.`,
        agentsDir
      );
    }
  }

  // Fallbacks for non-interactive or unprompted values
  projectName = projectName || path.basename(rootDir) || 'open-agent-workspace';
  projectDescription = projectDescription || 'AI-assisted multi-agent engineering workspace';
  packageManager = packageManager || 'pnpm';
  selectedTargets = selectedTargets && selectedTargets.length > 0 ? selectedTargets : DEFAULT_TARGETS;

  // Normalize targets
  const canonicalTargets: string[] = [];
  for (const t of selectedTargets) {
    try {
      const canonical = normalizeTarget(t);
      if (!canonicalTargets.includes(canonical)) {
        canonicalTargets.push(canonical);
      }
    } catch {
      // Ignore unknown target
    }
  }

  // Generate templates
  const templates = generateProjectTemplates({
    projectName,
    projectDescription,
    targets: canonicalTargets,
    packageManager,
    template: options.template,
  });

  const scaffoldedFiles: string[] = [];

  // Write templates to disk unless --dry-run
  if (!isDryRun) {
    for (const [relPath, content] of Object.entries(templates)) {
      const fullPath = path.join(rootDir, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      scaffoldedFiles.push(normalizePathSeparators(relPath));
    }
  } else {
    for (const relPath of Object.keys(templates)) {
      scaffoldedFiles.push(normalizePathSeparators(relPath));
    }
  }

  // Auto-build step (unless --no-build)
  let buildResult: BuildResult | undefined;
  if (options.noBuild !== true) {
    buildResult = await executeBuild({
      rootDir,
      targets: canonicalTargets,
      dryRun: isDryRun,
      strict: true,
    });
  }

  if (isInteractive) {
    p.outro(
      pc.green(
        `✔ Successfully initialized agent workspace with ${scaffoldedFiles.length} canonical core files!`
      )
    );
  }

  return {
    success: true,
    rootDir,
    agentsDir,
    scaffoldedFiles,
    targets: canonicalTargets,
    buildResult,
    isDryRun,
  };
}
