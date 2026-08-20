import type {
  Config,
  Persona,
  Rule,
  Hook,
  SkillFrontmatter,
  CanonicalTarget,
  AgentsProjectAST,
  ValidationResult,
} from 'open-agent-engine-core';

export interface CompiledFile {
  path: string;
  content: string;
  description?: string;
}

export interface CompileOptions {
  rootDir?: string;
  target?: CanonicalTarget | string;
  dryRun?: boolean;
  [key: string]: unknown;
}

export interface ResolvedSkill {
  name: string;
  description: string;
  version?: string;
  entrypoint?: string;
  compatibility?: unknown;
  body: string;
  path?: string;
}

export interface ResolvedAgentsProject {
  config: Config;
  personas: Persona[];
  rules: Rule[];
  hooks: Hook[];
  skills: ResolvedSkill[];
}

export interface LoadedProjectResult {
  ast: ResolvedAgentsProject;
  validation: ValidationResult;
  rawAst: AgentsProjectAST;
}

export interface Adapter {
  readonly target: CanonicalTarget;
  readonly name: string;
  readonly description: string;
  compile(
    project: ResolvedAgentsProject | AgentsProjectAST,
    options?: CompileOptions
  ): CompiledFile[] | Promise<CompiledFile[]>;
}
