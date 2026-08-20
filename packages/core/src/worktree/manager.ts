/**
 * Git Worktree Isolation Manager
 * @module @agent-engine/core/worktree/manager
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  GitExecutor,
  WorktreeInfo,
  WorktreeOptions,
  WorktreeCreateResult,
  WorktreeRemoveOptions,
  WorktreeMergeOptions,
  WorktreeMergeResult,
  WorktreeListOptions,
  WorktreeError,
  WorktreeLockError,
  WorktreeDirtyError,
} from './types.js';

const execFileAsync = promisify(execFile);

export const defaultGitExecutor: GitExecutor = async (args, options = {}) => {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: options.cwd || process.cwd(),
      env: options.env ? { ...process.env, ...options.env } : process.env,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode: 0,
    };
  } catch (err: unknown) {
    const error = err as { stdout?: string | Buffer; stderr?: string | Buffer; code?: number; message?: string };
    return {
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : (error.message || String(err)),
      exitCode: typeof error.code === 'number' ? error.code : 1,
    };
  }
};

export function isIndexLockError(stderr: string, stdout: string = ''): boolean {
  const combined = `${stderr} ${stdout}`.toLowerCase();
  return (
    combined.includes('index.lock') ||
    combined.includes('another git process seems to be running') ||
    (combined.includes('unable to create') && combined.includes('.git/index.lock'))
  );
}

export async function execGitWithRetry(
  exec: GitExecutor,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    retryAttempts?: number;
    retryDelayMs?: number;
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const maxAttempts = options.retryAttempts ?? 5;
  const baseDelay = options.retryDelayMs ?? 100;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await exec(args, { cwd: options.cwd, env: options.env });
    if (res.exitCode === 0) {
      return res;
    }

    if (isIndexLockError(res.stderr, res.stdout)) {
      if (attempt === maxAttempts) {
        throw new WorktreeLockError(
          `Git index lock contention persisted after ${maxAttempts} attempts: ${res.stderr || res.stdout}`,
          maxAttempts
        );
      }
      const jitter = Math.floor(Math.random() * 50);
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return res;
  }

  throw new WorktreeLockError(
    `Git index lock contention persisted after ${maxAttempts} attempts`,
    maxAttempts
  );
}

export function parseWorktreePorcelain(output: string): WorktreeInfo[] {
  const results: WorktreeInfo[] = [];
  const blocks = output.trim().split(/\r?\n\r?\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split(/\r?\n/);
    let worktreePath = '';
    let head = '';
    let branch: string | undefined;
    let bare: boolean | undefined;
    let locked: boolean | string | undefined;
    let prunable: boolean | string | undefined;
    let detached: boolean | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('worktree ')) {
        worktreePath = trimmed.slice(9).trim();
      } else if (trimmed.startsWith('HEAD ')) {
        head = trimmed.slice(5).trim();
      } else if (trimmed.startsWith('branch ')) {
        branch = trimmed.slice(7).trim();
      } else if (trimmed === 'bare') {
        bare = true;
      } else if (trimmed === 'detached') {
        detached = true;
      } else if (trimmed.startsWith('locked')) {
        const reason = trimmed.slice(6).trim();
        locked = reason.length > 0 ? reason : true;
      } else if (trimmed.startsWith('prunable')) {
        const reason = trimmed.slice(8).trim();
        prunable = reason.length > 0 ? reason : true;
      }
    }

    if (worktreePath && (head || bare)) {
      const normalizedPath = worktreePath.replace(/\\/g, '/');
      results.push({
        path: normalizedPath,
        head: head || '',
        ...(branch !== undefined && { branch }),
        ...(bare !== undefined && { bare }),
        ...(locked !== undefined && { locked }),
        ...(prunable !== undefined && { prunable }),
        ...(detached !== undefined && { detached }),
      });
    }
  }

  return results;
}

export async function resolveBaseBranch(
  exec: GitExecutor,
  cwd: string,
  preferredBase?: string
): Promise<string> {
  if (preferredBase) {
    const res = await exec(['rev-parse', '--verify', preferredBase], { cwd });
    if (res.exitCode === 0) return preferredBase;

    const remoteRes = await exec(['rev-parse', '--verify', `origin/${preferredBase}`], { cwd });
    if (remoteRes.exitCode === 0) return `origin/${preferredBase}`;
    return preferredBase;
  }

  for (const candidate of ['sprint/sprint-1', 'main', 'master']) {
    const res = await exec(['rev-parse', '--verify', candidate], { cwd });
    if (res.exitCode === 0) return candidate;
  }

  const headRes = await exec(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  if (headRes.exitCode === 0 && headRes.stdout.trim() && headRes.stdout.trim() !== 'HEAD') {
    return headRes.stdout.trim();
  }

  return 'main';
}

export async function createWorktree(options: WorktreeOptions): Promise<WorktreeCreateResult> {
  const exec = options.exec || defaultGitExecutor;
  const cwd = options.cwd || process.cwd();

  let targetPath: string;
  if (options.path) {
    targetPath = path.isAbsolute(options.path) ? options.path : path.resolve(cwd, options.path);
  } else if (options.taskId) {
    targetPath = path.resolve(cwd, '.worktrees', options.taskId);
  } else {
    throw new WorktreeError('createWorktree requires either `taskId` or `path` to be specified');
  }

  const branchName = options.branch || (options.taskId ? `task/${options.taskId}` : `worktree-${Date.now()}`);
  const baseBranch = await resolveBaseBranch(exec, cwd, options.baseBranch);

  const branchCheck = await exec(['rev-parse', '--verify', '--quiet', `refs/heads/${branchName}`], { cwd });
  const branchExists = branchCheck.exitCode === 0;

  const args: string[] = ['worktree', 'add'];

  if (options.detached) {
    args.push('--detach');
  } else if (!branchExists || options.createBranch) {
    args.push('-b', branchName);
  }

  if (options.lock) {
    if (typeof options.lock === 'string') {
      args.push('--lock', '--reason', options.lock);
    } else {
      args.push('--lock');
    }
  }

  args.push(targetPath);

  if (options.detached || !branchExists || options.createBranch) {
    args.push(baseBranch);
  } else {
    args.push(branchName);
  }

  try {
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  } catch {
    // Ignored
  }

  const addRes = await execGitWithRetry(exec, args, {
    cwd,
    retryAttempts: options.retryAttempts,
    retryDelayMs: options.retryDelayMs,
  });

  if (addRes.exitCode !== 0) {
    throw new WorktreeError(
      `Failed to create worktree at "${targetPath}": ${addRes.stderr || addRes.stdout}`
    );
  }

  const headRes = await exec(['rev-parse', 'HEAD'], { cwd: targetPath });
  const head = headRes.stdout.trim();
  const normalizedPath = targetPath.replace(/\\/g, '/');

  return {
    path: normalizedPath,
    branch: branchName,
    head: head || '',
    isNewBranch: !branchExists || Boolean(options.createBranch),
  };
}

export async function removeWorktree(options: WorktreeRemoveOptions): Promise<void> {
  const exec = options.exec || defaultGitExecutor;
  const cwd = options.cwd || process.cwd();

  let targetPath: string;
  if (options.path) {
    targetPath = path.isAbsolute(options.path) ? options.path : path.resolve(cwd, options.path);
  } else if (options.taskId) {
    targetPath = path.resolve(cwd, '.worktrees', options.taskId);
  } else {
    throw new WorktreeError('removeWorktree requires either `path` or `taskId`');
  }

  const force = options.force ?? true;
  const removeArgs = ['worktree', 'remove'];
  if (force) {
    removeArgs.push('--force');
  }
  removeArgs.push(targetPath);

  await execGitWithRetry(exec, removeArgs, { cwd });
  await execGitWithRetry(exec, ['worktree', 'prune'], { cwd });

  try {
    if (fs.existsSync(targetPath)) {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup
  }

  try {
    const folderName = path.basename(targetPath);
    const gitDirRes = await exec(['rev-parse', '--git-common-dir'], { cwd });
    const gitCommonDir = gitDirRes.exitCode === 0 && gitDirRes.stdout.trim()
      ? gitDirRes.stdout.trim()
      : path.resolve(cwd, '.git');
    const adminPath = path.resolve(gitCommonDir, 'worktrees', folderName);
    if (fs.existsSync(adminPath)) {
      await fs.promises.rm(adminPath, { recursive: true, force: true });
    }
  } catch {
    // Best-effort metadata cleanup
  }

  if (options.deleteBranch) {
    const branchToDelete = options.branchName || (options.taskId ? `task/${options.taskId}` : undefined);
    if (branchToDelete) {
      await execGitWithRetry(exec, ['branch', '-D', branchToDelete], { cwd });
    }
  }
}

export async function listWorktrees(
  optionsOrCwd?: WorktreeListOptions | string
): Promise<WorktreeInfo[]> {
  const options: WorktreeListOptions =
    typeof optionsOrCwd === 'string' ? { cwd: optionsOrCwd } : optionsOrCwd || {};
  const exec = options.exec || defaultGitExecutor;
  const cwd = options.cwd || process.cwd();

  const res = await exec(['worktree', 'list', '--porcelain'], { cwd });
  if (res.exitCode !== 0) {
    throw new WorktreeError(`Failed to list worktrees: ${res.stderr || res.stdout}`);
  }

  return parseWorktreePorcelain(res.stdout);
}

export async function mergeWorktree(options: WorktreeMergeOptions): Promise<WorktreeMergeResult> {
  const exec = options.exec || defaultGitExecutor;
  const cwd = options.cwd || process.cwd();
  const strategy = options.strategy || 'fast-forward';

  let worktreePath: string | undefined;
  if (options.path) {
    worktreePath = path.isAbsolute(options.path) ? options.path : path.resolve(cwd, options.path);
  } else if (options.taskId) {
    worktreePath = path.resolve(cwd, '.worktrees', options.taskId);
  }

  if (worktreePath && (options.exec || fs.existsSync(worktreePath))) {
    const statusRes = await exec(['status', '--porcelain'], { cwd: worktreePath });
    if (statusRes.stdout.trim() && !options.allowDirty) {
      const dirtyFiles = statusRes.stdout
        .trim()
        .split(/\r?\n/)
        .map((line) => line.slice(3).trim());
      throw new WorktreeDirtyError(
        `Cannot merge dirty worktree at "${worktreePath}": uncommitted changes detected.`,
        dirtyFiles
      );
    }
  }

  let sourceBranch = options.branch;
  if (!sourceBranch && worktreePath && (options.exec || fs.existsSync(worktreePath))) {
    const branchRes = await exec(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktreePath });
    if (branchRes.exitCode === 0 && branchRes.stdout.trim() && branchRes.stdout.trim() !== 'HEAD') {
      sourceBranch = branchRes.stdout.trim();
    }
  }
  if (!sourceBranch && options.taskId) {
    sourceBranch = `task/${options.taskId}`;
  }
  if (!sourceBranch) {
    throw new WorktreeError('Cannot determine source branch for merge. Specify `branch` or `taskId`.');
  }

  const targetBranch = options.targetBranch || (await resolveBaseBranch(exec, cwd));

  const rootStatus = await exec(['status', '--porcelain'], { cwd });
  if (rootStatus.stdout.trim() && !options.allowDirty) {
    const dirtyFiles = rootStatus.stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.slice(3).trim());
    throw new WorktreeDirtyError(
      `Cannot merge into "${targetBranch}": root repository has uncommitted changes.`,
      dirtyFiles
    );
  }

  const checkoutRes = await execGitWithRetry(exec, ['checkout', targetBranch], { cwd });
  if (checkoutRes.exitCode !== 0) {
    return {
      success: false,
      sourceBranch,
      targetBranch,
      strategy,
      hasConflicts: false,
      error: `Failed to checkout target branch "${targetBranch}": ${checkoutRes.stderr || checkoutRes.stdout}`,
    };
  }

  const mergeArgs: string[] = ['merge'];
  if (strategy === 'fast-forward') {
    mergeArgs.push('--ff-only', sourceBranch);
  } else if (strategy === 'no-ff') {
    mergeArgs.push('--no-ff', sourceBranch);
    if (options.commitMessage) {
      mergeArgs.push('-m', options.commitMessage);
    } else {
      mergeArgs.push('-m', `Merge branch '${sourceBranch}' into ${targetBranch}`);
    }
  } else if (strategy === 'squash') {
    mergeArgs.push('--squash', sourceBranch);
  }

  const mergeRes = await execGitWithRetry(exec, mergeArgs, { cwd });

  if (mergeRes.exitCode !== 0) {
    const conflictRes = await exec(['diff', '--name-only', '--diff-filter=U'], { cwd });
    const conflictFiles = conflictRes.stdout.trim()
      ? conflictRes.stdout.trim().split(/\r?\n/)
      : [];

    const isConflict =
      conflictFiles.length > 0 ||
      mergeRes.stderr.toLowerCase().includes('conflict') ||
      mergeRes.stdout.toLowerCase().includes('conflict');

    if (isConflict) {
      await exec(['merge', '--abort'], { cwd });
      return {
        success: false,
        sourceBranch,
        targetBranch,
        strategy,
        hasConflicts: true,
        conflictFiles,
        error: `Merge conflict detected in: ${conflictFiles.join(', ') || 'files'}`,
      };
    }

    return {
      success: false,
      sourceBranch,
      targetBranch,
      strategy,
      hasConflicts: false,
      error: mergeRes.stderr || mergeRes.stdout,
    };
  }

  if (strategy === 'squash') {
    const msg = options.commitMessage || `Squash merge branch '${sourceBranch}' into ${targetBranch}`;
    const commitRes = await exec(['commit', '-m', msg], { cwd });
    if (commitRes.exitCode !== 0) {
      return {
        success: false,
        sourceBranch,
        targetBranch,
        strategy,
        hasConflicts: false,
        error: `Failed to commit squash merge: ${commitRes.stderr || commitRes.stdout}`,
      };
    }
  }

  const headRes = await exec(['rev-parse', 'HEAD'], { cwd });
  const mergeCommit = headRes.stdout.trim();

  return {
    success: true,
    sourceBranch,
    targetBranch,
    mergeCommit,
    strategy,
    hasConflicts: false,
  };
}
