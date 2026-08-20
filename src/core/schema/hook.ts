import { z } from 'zod';

export const HookEventEnum = z.enum(['PreToolUse', 'PostToolUse', 'PreCompact', 'SessionStart']);
export type HookEvent = z.infer<typeof HookEventEnum>;

export const HookActionEnum = z.enum(['allow', 'deny', 'ask_user']);
export type HookAction = z.infer<typeof HookActionEnum>;

export const HookRuleSchema = z.object({
  pattern: z.string().min(1, 'Rule pattern cannot be empty'),
  action: HookActionEnum,
  message: z.string().optional(),
});
export type HookRule = z.infer<typeof HookRuleSchema>;

export const HookSchema = z.object({
  id: z
    .string()
    .min(1, 'Hook id cannot be empty')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Hook id must contain only alphanumeric characters, dashes, or underscores'),
  event: HookEventEnum,
  target_tools: z.array(z.string()).min(1, 'At least one target tool must be specified'),
  rules: z.array(HookRuleSchema).default([]),
  fallback_action: z.enum(['allow', 'deny']).default('allow'),
});

export type Hook = z.infer<typeof HookSchema>;
