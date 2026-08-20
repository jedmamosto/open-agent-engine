import { describe, it, expect } from 'vitest';
import {
  parseWorktreePorcelain,
  isIndexLockError,
  execGitWithRetry,
  createWorktree,
  removeWorktree,
  listWorktrees,
  mergeWorktree,
  resolveBaseBranch,
} from '../worktree/manager.js';
import {
  WorktreeError,
  WorktreeLockError,
  WorktreeDirtyError,
  GitExecutor,
} from '../worktree/types.js';

describe('Git Worktree Porcelain Output Parser', () => {
  it('should parse single standard worktree entry', () => {
    const raw = `worktree /path/to/repo\nHEAD 0123456789abcdef0123456789abcdef01234567\nbranch refs/heads/main\n`;
    const parsed = parseWorktreePorcelain(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      path: '/path/to/repo',
      head: '0123456789abcdef0123456789abcdef01234567',
      branch: 'refs/heads/main',
    });
  });

  it('should parse multiple worktree entries with heterogeneous attributes', () => {
    const raw = `worktree C:\\dev\\open-agent-engine\nHEAD 1111111111111111111111111111111111111111\nbranch refs/heads/sprint/sprint-1\n\nworktree C:\\dev\\open-agent-engine\\.worktrees\\task-101\nHEAD 2222222222222222222222222222222222222222\nbranch refs/heads/task/task-101\nlocked Subagent active in task\n\nworktree C:\\dev\\open-agent-engine\\.worktrees\\task-102\nHEAD 3333333333333333333333333333333333333333\ndetached\n\nworktree C:\\dev\\open-agent-engine\\.worktrees\\orphaned\nHEAD 4444444444444444444444444444444444444444\nprunable gitdir file points to non-existent location\n\nworktree C:\\dev\\open-agent-engine\\.worktrees\\bare-repo\nbare\n`;
    const parsed = parseWorktreePorcelain(raw);
    expect(parsed).toHaveLength(5);
    expect(parsed[0].path).toBe('C:/dev/open-agent-engine');
    expect(parsed[0].branch).toBe('refs/heads/sprint/sprint-1');
    expect(parsed[1].path).toBe('C:/dev/open-agent-engine/.worktrees/task-101');
    expect(parsed[1].locked).toBe('Subagent active in task');
    expect(parsed[2].path).toBe('C:/dev/open-agent-engine/.worktrees/task-102');
    expect(parsed[2].detached).toBe(true);
    expect(parsed[3].path).toBe('C:/dev/open-agent-engine/.worktrees/orphaned');
    expect(parsed[3].prunable).toBe('gitdir file points to non-existent location');
    expect(parsed[4].path).toBe('C:/dev/open-agent-engine/.worktrees/bare-repo');
    expect(parsed[4].bare).toBe(true);
  });

  it('should handle Windows CRLF newlines smoothly', () => {
    const raw = "worktree C:\\repo\r\nHEAD aabbcc\r\nbranch refs/heads/main\r\n\r\nworktree C:\\repo\\.worktrees\\task-1\r\nHEAD ddeeff\r\nbranch refs/heads/task-1\r\n";
    const parsed = parseWorktreePorcelain(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].path).toBe('C:/repo');
    expect(parsed[1].path).toBe('C:/repo/.worktrees/task-1');
  });

  it('should return empty array for empty or whitespace-only output', () => {
    expect(parseWorktreePorcelain('')).toEqual([]);
    expect(parseWorktreePorcelain('   \n\r\n   ')).toEqual([]);
  });
});

describe('Index Lock Detection & Exponential Retry', () => {
  it('should identify index.lock contention messages', () => {
    expect(isIndexLockError("fatal: Unable to create 'C:/repo/.git/index.lock': File exists.")).toBe(true);
    expect(isIndexLockError("Another git process seems to be running in this repository")).toBe(true);
    expect(isIndexLockError('error: Your local changes would be overwritten by merge')).toBe(false);
  });

  it('should retry on index.lock and succeed once released', async () => {
    let callCount = 0;
    const mockExec: GitExecutor = async () => {
      callCount++;
      if (callCount < 3) {
        return {
          stdout: '',
          stderr: "fatal: Unable to create '.git/index.lock': File exists.",
          exitCode: 128,
        };
      }
      return { stdout: 'Success', stderr: '', exitCode: 0 };
    };

    const res = await execGitWithRetry(mockExec, ['status'], {
      retryAttempts: 4,
      retryDelayMs: 1,
    });

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe('Success');
    expect(callCount).toBe(3);
  });

  it('should throw WorktreeLockError when retry attempts are exhausted', async () => {
    const mockExec: GitExecutor = async () => ({
      stdout: '',
      stderr: "fatal: Unable to create '.git/index.lock': File exists.",
      exitCode: 128,
    });

    await expect(
      execGitWithRetry(mockExec, ['status'], {
        retryAttempts: 3,
        retryDelayMs: 1,
      })
    ).rejects.toThrow(WorktreeLockError);
  });

  it('should not retry on non-lock failures', async () => {
    let callCount = 0;
    const mockExec: GitExecutor = async () => {
      callCount++;
      return { stdout: '', stderr: 'fatal: pathspec did not match any files', exitCode: 1 };
    };

    const res = await execGitWithRetry(mockExec, ['checkout', 'unknown-branch'], {
      retryAttempts: 5,
      retryDelayMs: 1,
    });

    expect(callCount).toBe(1);
    expect(res.exitCode).toBe(1);
  });
});

describe('Base Branch Resolution', () => {
  it('should prefer explicit baseBranch if verified', async () => {
    const mockExec: GitExecutor = async (args) => {
      if (args[1] === '--verify' && args[2] === 'custom-sprint-branch') {
        return { stdout: 'commit-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: 'Not found', exitCode: 1 };
    };

    const base = await resolveBaseBranch(mockExec, '/repo', 'custom-sprint-branch');
    expect(base).toBe('custom-sprint-branch');
  });

  it('should fallback in order: sprint/sprint-1 -> main -> master', async () => {
    const mockExec: GitExecutor = async (args) => {
      if (args[2] === 'sprint/sprint-1') {
        return { stdout: '', stderr: 'Not found', exitCode: 1 };
      }
      if (args[2] === 'main') {
        return { stdout: 'main-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 1 };
    };

    const base = await resolveBaseBranch(mockExec, '/repo');
    expect(base).toBe('main');
  });
});

describe('createWorktree', () => {
  it('should throw when neither taskId nor path is specified', async () => {
    await expect(createWorktree({})).rejects.toThrow(
      'createWorktree requires either `taskId` or `path` to be specified'
    );
  });

  it('should create new worktree at default .worktrees/<taskId> with new branch', async () => {
    const commands: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      commands.push(args);
      if (args[0] === 'rev-parse' && args[3] === 'refs/heads/task/ENG-105') {
        return { stdout: '', stderr: 'Not found', exitCode: 1 };
      }
      if (args[0] === 'rev-parse' && args[2] === 'sprint/sprint-1') {
        return { stdout: 'sprint-sha', stderr: '', exitCode: 0 };
      }
      if (args[0] === 'worktree' && args[1] === 'add') {
        return { stdout: 'Preparing worktree', stderr: '', exitCode: 0 };
      }
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
        return { stdout: 'new-head-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    const result = await createWorktree({
      taskId: 'ENG-105',
      cwd: '/mock/repo',
      exec: mockExec,
    });

    expect(result.branch).toBe('task/ENG-105');
    expect(result.head).toBe('new-head-sha');
    expect(result.isNewBranch).toBe(true);
  });

  it('should support detached HEAD and custom lock reason', async () => {
    const commands: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      commands.push(args);
      if (args[0] === 'rev-parse' && args[2] === 'main') {
        return { stdout: 'main-sha', stderr: '', exitCode: 0 };
      }
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
        return { stdout: 'detached-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    const result = await createWorktree({
      taskId: 'ENG-106',
      baseBranch: 'main',
      detached: true,
      lock: 'Agent running unit test suite',
      cwd: '/mock/repo',
      exec: mockExec,
    });

    expect(result.head).toBe('detached-sha');
    const worktreeAddCmd = commands.find((c) => c[0] === 'worktree' && c[1] === 'add');
    expect(worktreeAddCmd).toContain('--detach');
    expect(worktreeAddCmd).toContain('--lock');
    expect(worktreeAddCmd).toContain('Agent running unit test suite');
  });
});

describe('removeWorktree', () => {
  it('should throw when neither path nor taskId is specified', async () => {
    await expect(removeWorktree({})).rejects.toThrow('removeWorktree requires either `path` or `taskId`');
  });

  it('should remove worktree and prune metadata', async () => {
    const executed: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      executed.push(args);
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    await removeWorktree({
      taskId: 'ENG-105',
      cwd: '/mock/repo',
      exec: mockExec,
    });

    expect(executed.some((c) => c[0] === 'worktree' && c[1] === 'remove')).toBe(true);
    expect(executed.some((c) => c[0] === 'worktree' && c[1] === 'prune')).toBe(true);
  });

  it('should delete branch when deleteBranch is true', async () => {
    const executed: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      executed.push(args);
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    await removeWorktree({
      taskId: 'ENG-105',
      deleteBranch: true,
      cwd: '/mock/repo',
      exec: mockExec,
    });

    const branchDeleteCmd = executed.find((c) => c[0] === 'branch' && c[1] === '-D');
    expect(branchDeleteCmd).toBeDefined();
    expect(branchDeleteCmd).toContain('task/ENG-105');
  });
});

describe('listWorktrees', () => {
  it('should return parsed list of worktrees from git output', async () => {
    const mockExec: GitExecutor = async (args) => {
      if (args[0] === 'worktree' && args[1] === 'list' && args[2] === '--porcelain') {
        return {
          stdout: `worktree /repo\nHEAD aaa111\nbranch refs/heads/main\n\nworktree /repo/.worktrees/task-1\nHEAD bbb222\nbranch refs/heads/task-1\n`,
          stderr: '',
          exitCode: 0,
        };
      }
      return { stdout: '', stderr: '', exitCode: 1 };
    };

    const list = await listWorktrees({ cwd: '/repo', exec: mockExec });
    expect(list).toHaveLength(2);
    expect(list[0].branch).toBe('refs/heads/main');
    expect(list[1].branch).toBe('refs/heads/task-1');
  });

  it('should throw WorktreeError if git worktree list fails', async () => {
    const mockExec: GitExecutor = async () => ({
      stdout: '',
      stderr: 'fatal: not a git repository',
      exitCode: 128,
    });

    await expect(listWorktrees({ exec: mockExec })).rejects.toThrow(WorktreeError);
  });
});

describe('mergeWorktree', () => {
  it('should reject merge if worktree has uncommitted modifications', async () => {
    const mockExec: GitExecutor = async (args, opts) => {
      if (args[0] === 'status' && opts?.cwd?.includes('.worktrees')) {
        return {
          stdout: ' M packages/core/src/index.ts\n?? new-file.ts',
          stderr: '',
          exitCode: 0,
        };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    await expect(
      mergeWorktree({
        taskId: 'ENG-105',
        cwd: '/repo',
        exec: mockExec,
      })
    ).rejects.toThrow(WorktreeDirtyError);
  });

  it('should execute fast-forward merge cleanly into target branch', async () => {
    const commands: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      commands.push(args);
      if (args[0] === 'rev-parse' && args[2] === 'sprint/sprint-1') {
        return { stdout: 'sprint-sha', stderr: '', exitCode: 0 };
      }
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
        return { stdout: 'merged-commit-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    const result = await mergeWorktree({
      taskId: 'ENG-105',
      targetBranch: 'sprint/sprint-1',
      strategy: 'fast-forward',
      cwd: '/repo',
      exec: mockExec,
    });

    expect(result.success).toBe(true);
    expect(result.mergeCommit).toBe('merged-commit-sha');
    expect(result.hasConflicts).toBe(false);
  });

  it('should execute no-ff merge with custom commit message', async () => {
    const commands: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      commands.push(args);
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
        return { stdout: 'no-ff-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    const result = await mergeWorktree({
      taskId: 'ENG-105',
      targetBranch: 'sprint/sprint-1',
      strategy: 'no-ff',
      commitMessage: 'feat(core): implement ephemeral git worktree engine',
      cwd: '/repo',
      exec: mockExec,
    });

    expect(result.success).toBe(true);
    expect(result.mergeCommit).toBe('no-ff-sha');
  });

  it('should execute squash merge and commit staged changes', async () => {
    const commands: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      commands.push(args);
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
        return { stdout: 'squash-sha', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    const result = await mergeWorktree({
      taskId: 'ENG-105',
      targetBranch: 'sprint/sprint-1',
      strategy: 'squash',
      commitMessage: 'feat(core): squash merge ticket ENG-105',
      cwd: '/repo',
      exec: mockExec,
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('squash');
    expect(commands.some((c) => c[0] === 'merge' && c[1] === '--squash')).toBe(true);
  });

  it('should detect merge conflicts, rollback via merge --abort, and return conflict files', async () => {
    const commands: string[][] = [];
    const mockExec: GitExecutor = async (args) => {
      commands.push(args);
      if (args[0] === 'merge') {
        return {
          stdout: 'Auto-merging packages/core/src/index.ts\nCONFLICT (content): Merge conflict in packages/core/src/index.ts',
          stderr: 'Automatic merge failed; fix conflicts and then commit the result.',
          exitCode: 1,
        };
      }
      if (args[0] === 'diff' && args.includes('--diff-filter=U')) {
        return {
          stdout: 'packages/core/src/index.ts\npackages/core/src/schema/config.ts',
          stderr: '',
          exitCode: 0,
        };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    };

    const result = await mergeWorktree({
      taskId: 'ENG-105',
      targetBranch: 'sprint/sprint-1',
      cwd: '/repo',
      exec: mockExec,
    });

    expect(result.success).toBe(false);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflictFiles).toEqual([
      'packages/core/src/index.ts',
      'packages/core/src/schema/config.ts',
    ]);
    expect(commands.some((c) => c[0] === 'merge' && c[1] === '--abort')).toBe(true);
  });
});
