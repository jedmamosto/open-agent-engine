import { z } from 'zod';

export const PersonaPermissionsSchema = z.object({
  tools: z.record(z.string(), z.boolean()).default({}),
  mcp_servers: z.array(z.string()).default([]),
});

export type PersonaPermissions = z.infer<typeof PersonaPermissionsSchema>;

export const ModelPreferencesSchema = z.object({
  reasoning_tier: z.enum(['low', 'medium', 'high']).default('medium'),
  preferred_models: z.array(z.string()).default([]),
});

export type ModelPreferences = z.infer<typeof ModelPreferencesSchema>;

export const PersonaSchema = z.object({
  id: z
    .string()
    .min(1, 'Persona id cannot be empty')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Persona id must contain only alphanumeric characters, dashes, or underscores'),
  name: z.string().min(1, 'Persona name cannot be empty'),
  description: z.string().default(''),
  system_prompt: z.string().min(1, 'System prompt cannot be empty'),
  permissions: PersonaPermissionsSchema.default({ tools: {}, mcp_servers: [] }),
  model_preferences: ModelPreferencesSchema.default({ reasoning_tier: 'medium', preferred_models: [] }),
  skills: z.array(z.string()).default([]),
});

export type Persona = z.infer<typeof PersonaSchema>;
