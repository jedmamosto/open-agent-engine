import { describe, it, expect } from 'vitest';
import { HookSchema } from '../schema/hook.js';

describe('HookSchema', () => {
  it('should validate a complete hook specification', () => {
    const rawHook = {
      id: 'pre-tool-safety-guard',
      event: 'PreToolUse',
      target_tools: ['Bash', 'terminal_execute'],
      rules: [
        {
          pattern: 'rm -rf /',
          action: 'deny',
          message: 'Destructive root filesystem deletion blocked.',
        },
        {
          pattern: 'git push --force',
          action: 'ask_user',
          message: 'Force push requires explicit user authorization.',
        },
      ],
      fallback_action: 'allow',
    };

    const parsed = HookSchema.parse(rawHook);
    expect(parsed.id).toBe('pre-tool-safety-guard');
    expect(parsed.event).toBe('PreToolUse');
    expect(parsed.target_tools).toEqual(['Bash', 'terminal_execute']);
    expect(parsed.rules).toHaveLength(2);
    expect(parsed.rules[0].action).toBe('deny');
    expect(parsed.rules[1].action).toBe('ask_user');
    expect(parsed.fallback_action).toBe('allow');
  });

  it('should apply fallback_action default when omitted', () => {
    const minimalHook = {
      id: 'post-tool-telemetry',
      event: 'PostToolUse',
      target_tools: ['Bash'],
    };

    const parsed = HookSchema.parse(minimalHook);
    expect(parsed.fallback_action).toBe('allow');
    expect(parsed.rules).toEqual([]);
  });

  it('should reject invalid event type or action type', () => {
    expect(() =>
      HookSchema.parse({
        id: 'bad-event-hook',
        event: 'InvalidEvent',
        target_tools: ['Bash'],
      })
    ).toThrow();

    expect(() =>
      HookSchema.parse({
        id: 'bad-action-hook',
        event: 'PreToolUse',
        target_tools: ['Bash'],
        rules: [
          {
            pattern: 'foo',
            action: 'unknown_action',
          },
        ],
      })
    ).toThrow();
  });

  it('should reject empty target_tools list', () => {
    expect(() =>
      HookSchema.parse({
        id: 'no-tools-hook',
        event: 'PreToolUse',
        target_tools: [],
      })
    ).toThrow();
  });
});
