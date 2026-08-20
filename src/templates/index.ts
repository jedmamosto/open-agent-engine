import { generateConfigTemplate, type ConfigTemplateOptions } from './config.js';
import { generatePersonaTemplate, type PersonaTemplateOptions } from './persona.js';
import { generateRuleTemplate, type RuleTemplateOptions } from './rule.js';
import { generateSkillTemplate, type SkillTemplateOptions } from './skill.js';
import { generateHookTemplate, type HookTemplateOptions } from './hook.js';

export * from './config.js';
export * from './persona.js';
export * from './rule.js';
export * from './skill.js';
export * from './hook.js';

export interface ProjectTemplateOptions {
  projectName?: string;
  projectDescription?: string;
  targets?: string[];
  packageManager?: string;
  template?: string;
}

/**
 * Returns a dictionary of relative file paths to their generated file contents.
 */
export function generateProjectTemplates(
  options: ProjectTemplateOptions = {}
): Record<string, string> {
  return {
    '.agents/config.yaml': generateConfigTemplate({
      projectName: options.projectName,
      projectDescription: options.projectDescription,
      targets: options.targets,
      packageManager: options.packageManager,
    }),
    '.agents/personas/default.md': generatePersonaTemplate(),
    '.agents/rules/000-base.md': generateRuleTemplate(),
    '.agents/skills/workspace-init/SKILL.md': generateSkillTemplate(),
    '.agents/hooks/hooks.json': generateHookTemplate(),
  };
}
