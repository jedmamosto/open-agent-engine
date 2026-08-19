import { z } from 'zod';

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1, 'Skill name cannot be empty'),
  description: z.string().default(''),
  version: z.string().optional(),
  entrypoint: z.string().optional(),
  compatibility: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())]).optional(),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;
