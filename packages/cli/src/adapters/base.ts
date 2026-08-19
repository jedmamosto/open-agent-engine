import {
  ConfigSchema,
  PersonaSchema,
  RuleSchema,
  HookSchema,
  SkillFrontmatterSchema,
  type CanonicalTarget,
  type AgentsProjectAST,
} from '@agent-engine/core';
import type {
  Adapter,
  CompileOptions,
  CompiledFile,
  ResolvedAgentsProject,
  ResolvedSkill,
} from './types.js';

export abstract class BaseAdapter implements Adapter {
  public abstract readonly target: CanonicalTarget;
  public abstract readonly name: string;
  public abstract readonly description: string;

  public abstract compile(
    project: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] | Promise<CompiledFile[]>;

  /**
   * Normalizes an unparsed or partial project AST into a typed ResolvedAgentsProject.
   */
  protected normalizeProject(
    input: ResolvedAgentsProject | AgentsProjectAST
  ): ResolvedAgentsProject {
    // 1. Config
    const configResult = ConfigSchema.safeParse(input.config || {});
    const config = configResult.success ? configResult.data : ConfigSchema.parse({});

    // 2. Personas
    const rawPersonas = Array.isArray(input.personas)
      ? input.personas
      : typeof input.personas === 'object' && input.personas !== null
        ? Object.values(input.personas)
        : [];
    const personas = rawPersonas
      .map((p) => {
        const parsed = PersonaSchema.safeParse(p);
        return parsed.success ? parsed.data : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // 3. Rules
    const rawRules = Array.isArray(input.rules)
      ? input.rules
      : typeof input.rules === 'object' && input.rules !== null
        ? Object.values(input.rules)
        : [];
    const rules = rawRules
      .map((r) => {
        const parsed = RuleSchema.safeParse(r);
        return parsed.success ? parsed.data : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // 4. Hooks
    const rawHooks = Array.isArray(input.hooks)
      ? input.hooks
      : typeof input.hooks === 'object' && input.hooks !== null
        ? Object.values(input.hooks)
        : [];
    const hooks = rawHooks
      .map((h) => {
        const parsed = HookSchema.safeParse(h);
        return parsed.success ? parsed.data : null;
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);

    // 5. Skills
    const rawSkills = Array.isArray(input.skills)
      ? input.skills
      : typeof input.skills === 'object' && input.skills !== null
        ? Object.values(input.skills)
        : [];

    const skills: ResolvedSkill[] = [];
    for (const s of rawSkills) {
      if (!s || typeof s !== 'object') continue;
      const skillObj = s as Record<string, unknown>;

      // If already ResolvedSkill-like
      if (typeof skillObj.name === 'string' && typeof skillObj.body === 'string') {
        const fmResult = SkillFrontmatterSchema.safeParse(skillObj);
        const name = fmResult.success ? fmResult.data.name : String(skillObj.name);
        const description = fmResult.success
          ? fmResult.data.description
          : typeof skillObj.description === 'string'
            ? skillObj.description
            : '';

        skills.push({
          name,
          description,
          version: fmResult.success
            ? fmResult.data.version
            : typeof skillObj.version === 'string'
              ? skillObj.version
              : undefined,
          entrypoint: fmResult.success
            ? fmResult.data.entrypoint
            : typeof skillObj.entrypoint === 'string'
              ? skillObj.entrypoint
              : undefined,
          compatibility: fmResult.success
            ? fmResult.data.compatibility
            : skillObj.compatibility,
          body: String(skillObj.body),
          path: typeof skillObj.path === 'string' ? skillObj.path : undefined,
        });
        continue;
      }

      // If frontmatter object directly
      const fmResult = SkillFrontmatterSchema.safeParse(skillObj);
      if (fmResult.success) {
        skills.push({
          name: fmResult.data.name,
          description: fmResult.data.description,
          version: fmResult.data.version,
          entrypoint: fmResult.data.entrypoint,
          compatibility: fmResult.data.compatibility,
          body: typeof skillObj.body === 'string' ? skillObj.body : '',
          path: typeof skillObj.path === 'string' ? skillObj.path : undefined,
        });
      }
    }

    return {
      config,
      personas,
      rules,
      hooks,
      skills,
    };
  }
}
