/**
 * Git Worktree Isolation Types & Interfaces
 * @module @agent-engine/core/worktree/types
 */

export type GitExecutor = (
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  }
) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

export interface WorktreeInfo {
  path: string;
  head: string;
  branch?: string;
  bare?: boolean;
  locked?: boolean | string;
  prunable?: boolean | string;
  detached?: boolean;
}

export interface WorktreeOptions {
  taskId?: string;
  path?: string;
  branch?: string;
  baseBranch?: string;
  cwd?: string;
  createBranch?: boolean;
  detached?: boolean;
  lock?: boolean | string;
  retryAttempts?: number;
  retryDelayMs?: number;
  exec?: GitExecutor;
}

export interface WorktreeCreateResult {
  path: string;
  branch: string;
  head: string;
  isNewBranch: boolean;
}

export interface WorktreeRemoveOptions {
  path?: string;
  taskId?: string;
  cwd?: string;
  force?: boolean;
  deleteBranch?: boolean;
  branchName?: string;
  exec?: GitExecutor;
}

export type WorktreeMergeStrategy = 'fast-forward' | 'no-ff' | 'squash';

export interface WorktreeMergeOptions {
  path?: string;
  taskId?: string;
  branch?: string;
  targetBranch?: string;
  strategy?: WorktreeMergeStrategy;
  commitMessage?: string;
  cwd?: string;
  allowDirty?: boolean;
  exec?: GitExecutor;
}

export interface WorktreeMergeResult {
  success: boolean;
  sourceBranch: string;
  targetBranch: string;
  mergeCommit?: string;
  strategy: WorktreeMergeStrategy;
  hasConflicts: boolean;
  conflictFiles?: string[];
  error?: string;
}

export interface WorktreeListOptions {
  cwd?: string;
  exec?: GitExecutor;
}

export class WorktreeError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'WorktreeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WorktreeLockError extends WorktreeError {
  constructor(message: string, public readonly attempts: number) {
    super(message, 'GIT_INDEX_LOCK_TIMEOUT');
    this.name = 'WorktreeLockError';
  }
}

export class WorktreeDirtyError extends WorktreeError {
  constructor(message: string, public readonly modifiedFiles: string[]) {
    super(message, 'WORKTREE_DIRTY');
    this.name = 'WorktreeDirtyError';
  }
}
