import { z } from 'zod';

export const CanonicalTargetEnum = z.enum([
  'claude',
  'cursor',
  'windsurf',
  'roo',
  'aider',
  'aaif',
]);
export type CanonicalTarget = z.infer<typeof CanonicalTargetEnum>;

export const TargetEnum = z.enum([
  'claude',
  'cursor',
  'windsurf',
  'roo',
  'aider',
  'aaif',
  'claude-code',
  'roo-code',
  'aaif-agents-md',
]);
export type Target = z.infer<typeof TargetEnum>;

export function normalizeTarget(target: Target | string): CanonicalTarget {
  switch (target) {
    case 'claude-code':
    case 'claude':
      return 'claude';
    case 'roo-code':
    case 'roo':
      return 'roo';
    case 'aaif-agents-md':
    case 'aaif':
      return 'aaif';
    case 'cursor':
      return 'cursor';
    case 'windsurf':
      return 'windsurf';
    case 'aider':
      return 'aider';
    default:
      throw new Error(`Unknown target: ${target}`);
  }
}

export const ConfigProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  authors: z.array(z.string()).optional(),
});
export type ConfigProject = z.infer<typeof ConfigProjectSchema>;

export const ConfigPathsSchema = z.object({
  personas: z.string().default('.agents/personas'),
  rules: z.string().default('.agents/rules'),
  skills: z.string().default('.agents/skills'),
  hooks: z.string().default('.agents/hooks'),
});
export type ConfigPaths = z.infer<typeof ConfigPathsSchema>;

export const ConfigRegistrySchema = z.object({
  skills: z.array(z.string()).default([]),
});
export type ConfigRegistry = z.infer<typeof ConfigRegistrySchema>;

export const ConfigSkillEntrySchema = z.object({
  source: z.string().optional(),
  version: z.string().optional(),
});
export type ConfigSkillEntry = z.infer<typeof ConfigSkillEntrySchema>;

export const ConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  project: ConfigProjectSchema.optional(),
  targets: z.array(TargetEnum).default(['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif']),
  registry: ConfigRegistrySchema.default({ skills: [] }),
  paths: ConfigPathsSchema.default({
    personas: '.agents/personas',
    rules: '.agents/rules',
    skills: '.agents/skills',
    hooks: '.agents/hooks',
  }),
  skills: z.record(z.string(), ConfigSkillEntrySchema).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
