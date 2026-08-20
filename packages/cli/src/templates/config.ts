export interface ConfigTemplateOptions {
  projectName?: string;
  projectDescription?: string;
  targets?: string[];
  packageManager?: string;
}

export const DEFAULT_TARGETS: string[] = [
  'claude',
  'cursor',
  'windsurf',
  'roo',
  'aider',
  'aaif',
];

/**
 * Generates canonical .agents/config.yaml content.
 */
export function generateConfigTemplate(options: ConfigTemplateOptions = {}): string {
  const projectName = options.projectName || 'open-agent-workspace';
  const projectDesc = options.projectDescription || 'AI-assisted multi-agent engineering workspace';
  const targets = options.targets && options.targets.length > 0 ? options.targets : DEFAULT_TARGETS;

  const targetLines = targets.map((t) => `  - ${t}`).join('\n');

  return `version: "1.0.0"
project:
  name: "${projectName}"
  description: "${projectDesc}"
  authors:
    - "Engineering Team"
targets:
${targetLines}
paths:
  personas: .agents/personas
  rules: .agents/rules
  skills: .agents/skills
  hooks: .agents/hooks
registry:
  skills:
    - workspace-init
`;
}
