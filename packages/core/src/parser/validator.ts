import { z } from 'zod';
import {
  PersonaSchema,
  RuleSchema,
  HookSchema,
  SkillFrontmatterSchema,
  ConfigSchema,
} from '../schema/index.js';

export type DiagnosticSeverity = 'error' | 'warning';

export interface DiagnosticIssue {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  entityId?: string;
  entityType?: 'persona' | 'rule' | 'hook' | 'skill' | 'config';
  line?: number;
  column?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: DiagnosticIssue[];
  warnings: DiagnosticIssue[];
}

export interface AgentsProjectAST {
  config?: unknown;
  personas?: unknown[] | Record<string, unknown>;
  rules?: unknown[] | Record<string, unknown>;
  hooks?: unknown[] | Record<string, unknown>;
  skills?: unknown[] | Record<string, unknown>;
}

/**
 * Validates glob pattern syntax.
 */
export function isValidGlob(pattern: string): boolean {
  if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
    return false;
  }

  let inBracket = false;
  let inBrace = 0;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (char === '[') {
      if (inBracket) return false; // nested bracket without closing
      inBracket = true;
    } else if (char === ']') {
      if (!inBracket) return false;
      inBracket = false;
    } else if (char === '{') {
      inBrace++;
    } else if (char === '}') {
      if (inBrace <= 0) return false;
      inBrace--;
    }
  }

  return !inBracket && inBrace === 0;
}

function zodIssuesToDiagnostics(
  issues: z.ZodIssue[],
  entityType: DiagnosticIssue['entityType'],
  entityId?: string
): DiagnosticIssue[] {
  return issues.map((issue) => ({
    severity: 'error',
    code: `INVALID_${entityType ? entityType.toUpperCase() : 'SCHEMA'}`,
    message: `${issue.path.length > 0 ? `Field "${issue.path.join('.')}" ` : ''}${issue.message}`,
    path: issue.path.join('.'),
    entityId,
    entityType,
  }));
}

export function validatePersona(data: unknown): ValidationResult {
  const result = PersonaSchema.safeParse(data);
  if (!result.success) {
    const errors = zodIssuesToDiagnostics(
      result.error.issues,
      'persona',
      (data as { id?: string })?.id
    );
    return { valid: false, errors, warnings: [] };
  }
  return { valid: true, errors: [], warnings: [] };
}

export function validateRule(data: unknown): ValidationResult {
  const result = RuleSchema.safeParse(data);
  if (!result.success) {
    const errors = zodIssuesToDiagnostics(
      result.error.issues,
      'rule',
      (data as { id?: string })?.id
    );
    return { valid: false, errors, warnings: [] };
  }

  const errors: DiagnosticIssue[] = [];
  const rule = result.data;

  // Validate globs
  if (rule.scope && rule.scope.globs) {
    for (const glob of rule.scope.globs) {
      if (!isValidGlob(glob)) {
        errors.push({
          severity: 'error',
          code: 'INVALID_GLOB_PATTERN',
          message: `Invalid glob pattern "${glob}" in rule "${rule.id}"`,
          path: 'scope.globs',
          entityId: rule.id,
          entityType: 'rule',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

export function validateHook(data: unknown): ValidationResult {
  const result = HookSchema.safeParse(data);
  if (!result.success) {
    const errors = zodIssuesToDiagnostics(
      result.error.issues,
      'hook',
      (data as { id?: string })?.id
    );
    return { valid: false, errors, warnings: [] };
  }
  return { valid: true, errors: [], warnings: [] };
}

export function validateSkillFrontmatter(data: unknown): ValidationResult {
  const result = SkillFrontmatterSchema.safeParse(data);
  if (!result.success) {
    const errors = zodIssuesToDiagnostics(
      result.error.issues,
      'skill',
      (data as { name?: string })?.name
    );
    return { valid: false, errors, warnings: [] };
  }
  return { valid: true, errors: [], warnings: [] };
}

export function validateConfig(data: unknown): ValidationResult {
  const result = ConfigSchema.safeParse(data);
  if (!result.success) {
    const errors = zodIssuesToDiagnostics(result.error.issues, 'config');
    return { valid: false, errors, warnings: [] };
  }
  return { valid: true, errors: [], warnings: [] };
}

/**
 * Validates an entire .agents/ project AST structure with cross-entity checks.
 */
export function validateAgentsProject(ast: AgentsProjectAST): ValidationResult {
  const errors: DiagnosticIssue[] = [];
  const warnings: DiagnosticIssue[] = [];

  // 1. Validate Config
  let parsedConfig: z.infer<typeof ConfigSchema> | undefined;
  if (ast.config) {
    const configRes = validateConfig(ast.config);
    errors.push(...configRes.errors);
    warnings.push(...configRes.warnings);
    if (configRes.valid) {
      parsedConfig = ConfigSchema.parse(ast.config);
    }
  }

  // Helper to normalize array or record
  const personasList: unknown[] = Array.isArray(ast.personas)
    ? ast.personas
    : typeof ast.personas === 'object' && ast.personas !== null
      ? Object.values(ast.personas)
      : [];

  const rulesList: unknown[] = Array.isArray(ast.rules)
    ? ast.rules
    : typeof ast.rules === 'object' && ast.rules !== null
      ? Object.values(ast.rules)
      : [];

  const hooksList: unknown[] = Array.isArray(ast.hooks)
    ? ast.hooks
    : typeof ast.hooks === 'object' && ast.hooks !== null
      ? Object.values(ast.hooks)
      : [];

  const skillsList: unknown[] = Array.isArray(ast.skills)
    ? ast.skills
    : typeof ast.skills === 'object' && ast.skills !== null
      ? Object.values(ast.skills)
      : [];

  // 2. Validate Personas & ID Uniqueness
  const seenPersonaIds = new Set<string>();
  for (const rawPersona of personasList) {
    const res = validatePersona(rawPersona);
    errors.push(...res.errors);
    warnings.push(...res.warnings);

    if (rawPersona && typeof rawPersona === 'object' && 'id' in rawPersona && typeof rawPersona.id === 'string' && rawPersona.id.length > 0) {
      const personaId = rawPersona.id;
      if (seenPersonaIds.has(personaId)) {
        errors.push({
          severity: 'error',
          code: 'DUPLICATE_PERSONA_ID',
          message: `Duplicate persona ID detected: "${personaId}"`,
          entityId: personaId,
          entityType: 'persona',
          path: `personas.${personaId}`,
        });
      } else {
        seenPersonaIds.add(personaId);
      }
    }
  }

  // 3. Validate Rules & ID Uniqueness & Glob syntax
  const seenRuleIds = new Set<string>();
  for (const rawRule of rulesList) {
    const res = validateRule(rawRule);
    errors.push(...res.errors);
    warnings.push(...res.warnings);

    if (rawRule && typeof rawRule === 'object' && 'id' in rawRule && typeof rawRule.id === 'string' && rawRule.id.length > 0) {
      const ruleId = rawRule.id;
      if (seenRuleIds.has(ruleId)) {
        errors.push({
          severity: 'error',
          code: 'DUPLICATE_RULE_ID',
          message: `Duplicate rule ID detected: "${ruleId}"`,
          entityId: ruleId,
          entityType: 'rule',
          path: `rules.${ruleId}`,
        });
      } else {
        seenRuleIds.add(ruleId);
      }
    }
  }

  // 4. Validate Hooks & ID Uniqueness
  const seenHookIds = new Set<string>();
  for (const rawHook of hooksList) {
    const res = validateHook(rawHook);
    errors.push(...res.errors);
    warnings.push(...res.warnings);

    if (rawHook && typeof rawHook === 'object' && 'id' in rawHook && typeof rawHook.id === 'string' && rawHook.id.length > 0) {
      const hookId = rawHook.id;
      if (seenHookIds.has(hookId)) {
        errors.push({
          severity: 'error',
          code: 'DUPLICATE_HOOK_ID',
          message: `Duplicate hook ID detected: "${hookId}"`,
          entityId: hookId,
          entityType: 'hook',
          path: `hooks.${hookId}`,
        });
      } else {
        seenHookIds.add(hookId);
      }
    }
  }

  // 5. Validate Skills & Name Uniqueness
  const seenSkillNames = new Set<string>();
  for (const rawSkill of skillsList) {
    const res = validateSkillFrontmatter(rawSkill);
    errors.push(...res.errors);
    warnings.push(...res.warnings);

    if (rawSkill && typeof rawSkill === 'object' && 'name' in rawSkill && typeof rawSkill.name === 'string' && rawSkill.name.length > 0) {
      const skillName = rawSkill.name;
      if (seenSkillNames.has(skillName)) {
        errors.push({
          severity: 'error',
          code: 'DUPLICATE_SKILL_NAME',
          message: `Duplicate skill name detected: "${skillName}"`,
          entityId: skillName,
          entityType: 'skill',
          path: `skills.${skillName}`,
        });
      } else {
        seenSkillNames.add(skillName);
      }
    }
  }

  // 6. Cross-Entity Skill Reference Integrity
  // Aggregate all known skill names (from AST skills, config.skills, and config.registry.skills)
  const knownSkillNames = new Set<string>(seenSkillNames);

  if (parsedConfig?.skills) {
    for (const skillKey of Object.keys(parsedConfig.skills)) {
      knownSkillNames.add(skillKey);
    }
  }
  if (parsedConfig?.registry?.skills) {
    for (const skillKey of parsedConfig.registry.skills) {
      knownSkillNames.add(skillKey);
    }
  }

  for (const rawPersona of personasList) {
    if (rawPersona && typeof rawPersona === 'object' && 'skills' in rawPersona && Array.isArray((rawPersona as { skills?: unknown }).skills)) {
      const personaId = ('id' in rawPersona && typeof rawPersona.id === 'string') ? rawPersona.id : 'unknown';
      const personaSkills = (rawPersona as { skills: unknown[] }).skills;
      for (const skillRef of personaSkills) {
        if (typeof skillRef === 'string' && !knownSkillNames.has(skillRef)) {
          errors.push({
            severity: 'error',
            code: 'MISSING_REFERENCED_SKILL',
            message: `Persona "${personaId}" references skill "${skillRef}" which is not found in skills or config`,
            entityId: personaId,
            entityType: 'persona',
            path: `personas.${personaId}.skills`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
