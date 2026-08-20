export interface HookTemplateOptions {
  id?: string;
  fallbackAction?: 'allow' | 'deny';
}

/**
 * Generates security and safety hooks JSON template (.agents/hooks/hooks.json).
 */
export function generateHookTemplate(options: HookTemplateOptions = {}): string {
  const id = options.id || 'safety-guard';
  const fallbackAction = options.fallbackAction || 'allow';

  const hooks = [
    {
      id,
      event: 'PreToolUse',
      target_tools: ['Bash', 'terminal_execute', 'bash'],
      rules: [
        {
          pattern: 'rm\\s+-rf\\s+/(?:$|\\s)',
          action: 'deny',
          message: 'Destructive root filesystem deletion is prohibited.',
        },
        {
          pattern: 'git\\s+push\\s+.*--force.*main',
          action: 'deny',
          message: 'Force pushing to main branch is prohibited.',
        },
      ],
      fallback_action: fallbackAction,
    },
  ];

  return JSON.stringify(hooks, null, 2) + '\n';
}
