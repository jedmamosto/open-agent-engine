import type { ResolvedAgentsProject } from '../../adapters/types.js';

export function createMockProject(overrides?: Partial<ResolvedAgentsProject>): ResolvedAgentsProject {
  return {
    config: {
      version: '1.0.0',
      project: {
        name: 'test-project',
        description: 'Test Multi-Agent Engine Workspace',
        authors: ['Test Author'],
      },
      targets: ['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif'],
      registry: { skills: [] },
      paths: {
        personas: '.agents/personas',
        rules: '.agents/rules',
        skills: '.agents/skills',
        hooks: '.agents/hooks',
      },
      ...overrides?.config,
    },
    personas: overrides?.personas ?? [
      {
        id: 'tech-lead',
        name: 'Tech Lead Architect',
        description: 'System architect and lead orchestrator.',
        system_prompt: 'You are a Principal Software Architect with 15+ years of experience.',
        permissions: {
          tools: {
            read_files: true,
            write_files: true,
            execute_bash: true,
            browser: true,
          },
          mcp_servers: ['playwright'],
        },
        model_preferences: {
          reasoning_tier: 'high',
          preferred_models: ['claude-3-7-sonnet', 'gpt-4o'],
        },
        skills: ['handoff', 'testing-suite'],
      },
      {
        id: 'qa-engineer',
        name: 'QA Engineer',
        description: 'Autonomous TDD architect.',
        system_prompt: 'You are a QA automation engineer.',
        permissions: {
          tools: {
            read_files: true,
            write_files: true,
          },
          mcp_servers: [],
        },
        model_preferences: {
          reasoning_tier: 'medium',
          preferred_models: ['claude-3-5-sonnet'],
        },
        skills: ['testing-suite'],
      },
    ],
    rules: overrides?.rules ?? [
      {
        id: 'typescript-strictness',
        description: 'Enforce strict TypeScript type safety without any.',
        scope: {
          globs: ['src/**/*.ts', 'packages/**/*.ts'],
          always_apply: true,
        },
        content: '- Never use `any`.\n- Always specify return types on exported functions.',
      },
      {
        id: 'test-coverage',
        description: 'Ensure 100% test coverage on new adapters.',
        scope: {
          globs: ['src/**/__tests__/**/*.ts'],
          always_apply: false,
        },
        content: '- Write comprehensive unit tests with Vitest.\n- Test edge cases and malformed inputs.',
      },
    ],
    hooks: overrides?.hooks ?? [
      {
        id: 'safety-guard',
        event: 'PreToolUse',
        target_tools: ['execute_bash', 'Bash'],
        rules: [
          {
            pattern: 'rm -rf /',
            action: 'deny',
            message: 'Root filesystem deletion blocked.',
          },
        ],
        fallback_action: 'allow',
      },
    ],
    skills: overrides?.skills ?? [
      {
        name: 'handoff',
        description: 'Session snapshot and context continuity protocol.',
        version: '1.0.0',
        entrypoint: 'scripts/handoff.sh',
        body: '# Handoff Protocol\nSaves session state.',
      },
      {
        name: 'testing-suite',
        description: 'Automated test suite execution and reporting.',
        version: '1.0.0',
        entrypoint: 'scripts/test.sh',
        body: '# Testing Suite Protocol\nRuns vitest.',
      },
    ],
  };
}
