import { z } from 'zod';

export const RuleScopeSchema = z.object({
  globs: z.array(z.string()).default([]),
  always_apply: z.boolean().default(false),
});

export type RuleScope = z.infer<typeof RuleScopeSchema>;

export const RuleSchema = z.object({
  id: z
    .string()
    .min(1, 'Rule id cannot be empty')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Rule id must contain only alphanumeric characters, dashes, or underscores'),
  description: z.string().default(''),
  scope: RuleScopeSchema.default({ globs: [], always_apply: false }),
  content: z.string().min(1, 'Rule content cannot be empty'),
});

export type Rule = z.infer<typeof RuleSchema>;
